export interface ToastOptions {
  maxCount?: number
}

class Toast {
  private container: HTMLElement
  private toasts: HTMLElement[] = []
  maxCount = 3

  constructor(options: ToastOptions = {}) {
    const { maxCount } = options
    if (maxCount) {
      this.maxCount = maxCount
    }
    this.container = document.createElement('div')
    this.container.style.position = 'fixed'
    this.container.style.top = '20px'
    this.container.style.left = '50%'
    this.container.style.transform = 'translateX(-50%)'
    this.container.style.zIndex = '1000'
    document.body.appendChild(this.container)
  }

  show(message: string, duration: number = 3000) {
    if (this.toasts.length >= this.maxCount) {
      const firstToast = this.toasts.shift()
      if (firstToast && this.container.contains(firstToast)) {
        this.container.removeChild(firstToast)
      }
    }

    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'
    toast.style.color = 'white'
    toast.style.padding = '10px 20px'
    toast.style.marginBottom = '10px'
    toast.style.borderRadius = '5px'
    toast.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)'
    toast.style.transition = 'opacity 0.3s ease-in-out'
    toast.style.opacity = '1'

    this.container.appendChild(toast)
    this.toasts.push(toast)

    setTimeout(() => {
      toast.style.opacity = '0'
      setTimeout(() => {
        if (this.container.contains(toast)) {
          this.container.removeChild(toast)
        }
        this.toasts = this.toasts.filter((t) => t !== toast)
      }, 300)
    }, duration)
  }
}

export const toast = new Toast({ maxCount: 3 })
