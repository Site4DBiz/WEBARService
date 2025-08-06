export interface MindARScripts {
  aframe: boolean
  three: boolean
  mindARImage: boolean
  mindARImageAframe: boolean
  mindARFace: boolean
  mindARFaceAframe: boolean
}

export const loadMindARScripts = (scripts: Partial<MindARScripts> = {}): Promise<void> => {
  const defaultScripts: MindARScripts = {
    aframe: true,
    three: true,
    mindARImage: true,
    mindARImageAframe: true,
    mindARFace: false,
    mindARFaceAframe: false,
    ...scripts,
  }

  return new Promise((resolve, reject) => {
    const scriptsToLoad: { id: string; src: string }[] = []

    if (defaultScripts.aframe && !document.getElementById('aframe-script')) {
      scriptsToLoad.push({
        id: 'aframe-script',
        src: 'https://cdn.jsdelivr.net/npm/aframe@1.4.0/dist/aframe-master.min.js',
      })
    }

    if (defaultScripts.three && !document.getElementById('three-script')) {
      scriptsToLoad.push({
        id: 'three-script',
        src: 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
      })
    }

    if (defaultScripts.mindARImage && !document.getElementById('mindar-image-script')) {
      scriptsToLoad.push({
        id: 'mindar-image-script',
        src: '/lib/mindar-image.prod.js',
      })
    }

    if (
      defaultScripts.mindARImageAframe &&
      !document.getElementById('mindar-image-aframe-script')
    ) {
      scriptsToLoad.push({
        id: 'mindar-image-aframe-script',
        src: '/lib/mindar-image-aframe.prod.js',
      })
    }

    if (defaultScripts.mindARFace && !document.getElementById('mindar-face-script')) {
      scriptsToLoad.push({
        id: 'mindar-face-script',
        src: '/lib/mindar-face.prod.js',
      })
    }

    if (defaultScripts.mindARFaceAframe && !document.getElementById('mindar-face-aframe-script')) {
      scriptsToLoad.push({
        id: 'mindar-face-aframe-script',
        src: '/lib/mindar-face-aframe.prod.js',
      })
    }

    if (scriptsToLoad.length === 0) {
      resolve()
      return
    }

    let loadedCount = 0
    const checkAllLoaded = () => {
      loadedCount++
      if (loadedCount === scriptsToLoad.length) {
        setTimeout(resolve, 100)
      }
    }

    scriptsToLoad.forEach(({ id, src }) => {
      const script = document.createElement('script')
      script.id = id
      script.src = src
      script.async = false
      script.onload = checkAllLoaded
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      document.head.appendChild(script)
    })
  })
}

export const unloadMindARScripts = (): void => {
  const scriptIds = [
    'aframe-script',
    'three-script',
    'mindar-image-script',
    'mindar-image-aframe-script',
    'mindar-face-script',
    'mindar-face-aframe-script',
  ]

  scriptIds.forEach((id) => {
    const script = document.getElementById(id)
    if (script) {
      script.remove()
    }
  })
}
