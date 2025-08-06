import * as THREE from 'three'
import { AudioManager } from './AudioManager'

export type InteractionType = 'click' | 'hover' | 'drag' | 'pinch' | 'rotate'

export interface InteractionEvent {
  type: InteractionType
  object: THREE.Object3D
  point?: THREE.Vector3
  distance?: number
  rotation?: number
  scale?: number
  originalEvent?: MouseEvent | TouchEvent
}

export interface InteractionConfig {
  enableClick?: boolean
  enableHover?: boolean
  enableDrag?: boolean
  enablePinch?: boolean
  enableRotate?: boolean
  onClick?: (event: InteractionEvent) => void
  onHover?: (event: InteractionEvent) => void
  onHoverEnd?: (event: InteractionEvent) => void
  onDragStart?: (event: InteractionEvent) => void
  onDragMove?: (event: InteractionEvent) => void
  onDragEnd?: (event: InteractionEvent) => void
  onPinch?: (event: InteractionEvent) => void
  onRotate?: (event: InteractionEvent) => void
}

export interface InteractableObject {
  object: THREE.Object3D
  config: InteractionConfig
  animations?: {
    onClick?: string
    onHover?: string
  }
  actions?: {
    url?: string
    sound?: string
    colorChange?: number
    scaleChange?: number
  }
}

export class InteractionManager {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private raycaster: THREE.Raycaster
  private interactables: Map<string, InteractableObject>
  private hoveredObject: THREE.Object3D | null = null
  private draggedObject: THREE.Object3D | null = null
  private isDragging = false
  private touchStartDistance = 0
  private touchStartRotation = 0
  private lastTouchPositions: { [key: number]: { x: number; y: number } } = {}
  private plane: THREE.Plane
  private offset: THREE.Vector3
  private intersection: THREE.Vector3
  private enabled = true
  private audioManager: AudioManager

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.raycaster = new THREE.Raycaster()
    this.interactables = new Map()
    this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    this.offset = new THREE.Vector3()
    this.intersection = new THREE.Vector3()
    this.audioManager = new AudioManager()

    this.setupEventListeners()
  }

  private setupEventListeners(): void {
    const domElement = this.renderer.domElement

    // Mouse events
    domElement.addEventListener('mousedown', this.onMouseDown.bind(this))
    domElement.addEventListener('mousemove', this.onMouseMove.bind(this))
    domElement.addEventListener('mouseup', this.onMouseUp.bind(this))
    domElement.addEventListener('click', this.onClick.bind(this))

    // Touch events
    domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false })
    domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false })
    domElement.addEventListener('touchend', this.onTouchEnd.bind(this), { passive: false })

    // Prevent context menu on right click
    domElement.addEventListener('contextmenu', (e) => e.preventDefault())
  }

  public addInteractable(id: string, interactable: InteractableObject): void {
    // Ensure the object is in the scene
    if (!this.scene.children.includes(interactable.object)) {
      this.scene.add(interactable.object)
    }
    
    // Set userData for identification
    interactable.object.userData.interactableId = id
    interactable.object.userData.interactive = true
    
    this.interactables.set(id, interactable)
  }

  public removeInteractable(id: string): void {
    const interactable = this.interactables.get(id)
    if (interactable) {
      this.scene.remove(interactable.object)
      this.interactables.delete(id)
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.hoveredObject = null
      this.draggedObject = null
      this.isDragging = false
    }
  }

  private getIntersectedObject(event: MouseEvent | Touch): THREE.Object3D | null {
    if (!this.enabled) return null

    const rect = this.renderer.domElement.getBoundingClientRect()
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    )

    this.raycaster.setFromCamera(mouse, this.camera)
    
    const interactableObjects = Array.from(this.interactables.values()).map(i => i.object)
    const intersects = this.raycaster.intersectObjects(interactableObjects, true)

    if (intersects.length > 0) {
      // Find the root interactive object
      let object = intersects[0].object
      while (object.parent && !object.userData.interactive) {
        object = object.parent
      }
      return object.userData.interactive ? object : null
    }

    return null
  }

  private onClick(event: MouseEvent): void {
    if (!this.enabled || this.isDragging) return

    const object = this.getIntersectedObject(event)
    if (object) {
      const id = object.userData.interactableId
      const interactable = this.interactables.get(id)
      
      if (interactable?.config.enableClick) {
        const intersectionPoint = this.raycaster.intersectObject(object, true)[0]?.point
        
        const interactionEvent: InteractionEvent = {
          type: 'click',
          object,
          point: intersectionPoint,
          originalEvent: event
        }

        // Execute actions
        if (interactable.actions?.url) {
          window.open(interactable.actions.url, '_blank')
        }

        if (interactable.actions?.sound) {
          this.audioManager.playSoundEffect(interactable.actions.sound).catch(error => {
            console.error('Failed to play sound:', error)
          })
        }

        if (interactable.actions?.colorChange !== undefined) {
          const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial
          if (material) {
            material.color.setHex(interactable.actions.colorChange)
          }
        }

        if (interactable.actions?.scaleChange !== undefined) {
          const scale = interactable.actions.scaleChange
          object.scale.set(scale, scale, scale)
        }

        // Trigger animation if configured
        if (interactable.animations?.onClick && (object as any).mixer) {
          const mixer = (object as any).mixer as THREE.AnimationMixer
          const action = mixer.clipAction(
            THREE.AnimationClip.findByName(
              (object as any).animations,
              interactable.animations.onClick
            )
          )
          if (action) {
            action.reset().play()
          }
        }

        interactable.config.onClick?.(interactionEvent)
      }
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.enabled) return

    const object = this.getIntersectedObject(event)
    if (object) {
      const id = object.userData.interactableId
      const interactable = this.interactables.get(id)
      
      if (interactable?.config.enableDrag) {
        this.isDragging = true
        this.draggedObject = object
        
        const intersectionPoint = this.raycaster.intersectObject(object, true)[0]?.point
        if (intersectionPoint) {
          this.plane.setFromNormalAndCoplanarPoint(
            this.camera.getWorldDirection(new THREE.Vector3()),
            intersectionPoint
          )
          this.offset.copy(intersectionPoint).sub(object.position)
        }

        const interactionEvent: InteractionEvent = {
          type: 'drag',
          object,
          point: intersectionPoint,
          originalEvent: event
        }

        interactable.config.onDragStart?.(interactionEvent)
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.enabled) return

    // Handle hover
    const object = this.getIntersectedObject(event)
    
    if (object !== this.hoveredObject) {
      // Handle hover end
      if (this.hoveredObject) {
        const prevId = this.hoveredObject.userData.interactableId
        const prevInteractable = this.interactables.get(prevId)
        
        if (prevInteractable?.config.enableHover) {
          const interactionEvent: InteractionEvent = {
            type: 'hover',
            object: this.hoveredObject,
            originalEvent: event
          }
          prevInteractable.config.onHoverEnd?.(interactionEvent)
        }

        this.renderer.domElement.style.cursor = 'default'
      }

      // Handle hover start
      if (object) {
        const id = object.userData.interactableId
        const interactable = this.interactables.get(id)
        
        if (interactable?.config.enableHover) {
          const interactionEvent: InteractionEvent = {
            type: 'hover',
            object,
            originalEvent: event
          }
          interactable.config.onHover?.(interactionEvent)

          // Trigger hover animation if configured
          if (interactable.animations?.onHover && (object as any).mixer) {
            const mixer = (object as any).mixer as THREE.AnimationMixer
            const action = mixer.clipAction(
              THREE.AnimationClip.findByName(
                (object as any).animations,
                interactable.animations.onHover
              )
            )
            if (action) {
              action.reset().play()
            }
          }

          this.renderer.domElement.style.cursor = 'pointer'
        }
      }

      this.hoveredObject = object
    }

    // Handle drag
    if (this.isDragging && this.draggedObject) {
      const rect = this.renderer.domElement.getBoundingClientRect()
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )

      this.raycaster.setFromCamera(mouse, this.camera)
      
      if (this.raycaster.ray.intersectPlane(this.plane, this.intersection)) {
        this.draggedObject.position.copy(this.intersection.sub(this.offset))
        
        const id = this.draggedObject.userData.interactableId
        const interactable = this.interactables.get(id)
        
        if (interactable) {
          const interactionEvent: InteractionEvent = {
            type: 'drag',
            object: this.draggedObject,
            point: this.intersection.clone(),
            originalEvent: event
          }
          interactable.config.onDragMove?.(interactionEvent)
        }
      }
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.enabled) return

    if (this.isDragging && this.draggedObject) {
      const id = this.draggedObject.userData.interactableId
      const interactable = this.interactables.get(id)
      
      if (interactable) {
        const interactionEvent: InteractionEvent = {
          type: 'drag',
          object: this.draggedObject,
          originalEvent: event
        }
        interactable.config.onDragEnd?.(interactionEvent)
      }
    }

    this.isDragging = false
    this.draggedObject = null
  }

  private onTouchStart(event: TouchEvent): void {
    if (!this.enabled) return
    event.preventDefault()

    // Store touch positions
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i]
      this.lastTouchPositions[touch.identifier] = {
        x: touch.clientX,
        y: touch.clientY
      }
    }

    if (event.touches.length === 1) {
      // Single touch - treat as mouse down
      const touch = event.touches[0]
      this.onMouseDown(touch as any)
    } else if (event.touches.length === 2) {
      // Two touches - prepare for pinch/rotate
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      
      this.touchStartDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      
      this.touchStartRotation = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      )
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.enabled) return
    event.preventDefault()

    if (event.touches.length === 1) {
      // Single touch - treat as mouse move
      const touch = event.touches[0]
      this.onMouseMove(touch as any)
    } else if (event.touches.length === 2) {
      // Two touches - handle pinch/rotate
      const touch1 = event.touches[0]
      const touch2 = event.touches[1]
      
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      )
      
      const currentRotation = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      )
      
      // Calculate scale and rotation deltas
      const scale = currentDistance / this.touchStartDistance
      const rotation = currentRotation - this.touchStartRotation
      
      // Find object at midpoint
      const midX = (touch1.clientX + touch2.clientX) / 2
      const midY = (touch1.clientY + touch2.clientY) / 2
      const midPoint = { clientX: midX, clientY: midY } as Touch
      
      const object = this.getIntersectedObject(midPoint)
      if (object) {
        const id = object.userData.interactableId
        const interactable = this.interactables.get(id)
        
        if (interactable) {
          if (interactable.config.enablePinch && Math.abs(scale - 1) > 0.01) {
            const interactionEvent: InteractionEvent = {
              type: 'pinch',
              object,
              scale,
              originalEvent: event
            }
            interactable.config.onPinch?.(interactionEvent)
            
            // Apply scale
            object.scale.multiplyScalar(scale)
            this.touchStartDistance = currentDistance
          }
          
          if (interactable.config.enableRotate && Math.abs(rotation) > 0.01) {
            const interactionEvent: InteractionEvent = {
              type: 'rotate',
              object,
              rotation,
              originalEvent: event
            }
            interactable.config.onRotate?.(interactionEvent)
            
            // Apply rotation
            object.rotateZ(rotation)
            this.touchStartRotation = currentRotation
          }
        }
      }
    }

    // Update touch positions
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i]
      this.lastTouchPositions[touch.identifier] = {
        x: touch.clientX,
        y: touch.clientY
      }
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (!this.enabled) return
    event.preventDefault()

    // Clean up ended touches
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i]
      delete this.lastTouchPositions[touch.identifier]
    }

    if (event.touches.length === 0) {
      // All touches ended
      if (this.isDragging) {
        this.onMouseUp(event.changedTouches[0] as any)
      } else {
        // Check for tap
        this.onClick(event.changedTouches[0] as any)
      }
      
      this.lastTouchPositions = {}
    }
  }

  public getAudioManager(): AudioManager {
    return this.audioManager
  }

  public dispose(): void {
    const domElement = this.renderer.domElement
    
    // Remove all event listeners
    domElement.removeEventListener('mousedown', this.onMouseDown.bind(this))
    domElement.removeEventListener('mousemove', this.onMouseMove.bind(this))
    domElement.removeEventListener('mouseup', this.onMouseUp.bind(this))
    domElement.removeEventListener('click', this.onClick.bind(this))
    domElement.removeEventListener('touchstart', this.onTouchStart.bind(this))
    domElement.removeEventListener('touchmove', this.onTouchMove.bind(this))
    domElement.removeEventListener('touchend', this.onTouchEnd.bind(this))
    
    // Clear all interactables
    this.interactables.clear()
    
    // Dispose audio manager
    this.audioManager.dispose()
    
    // Reset state
    this.hoveredObject = null
    this.draggedObject = null
    this.isDragging = false
  }
}