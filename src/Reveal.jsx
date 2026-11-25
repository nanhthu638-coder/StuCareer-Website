import { useEffect, useRef, useState } from 'react'

// Hiện dần từ dưới lên đúng một lần khi phần tử cuộn vào màn hình; hiệu ứng nằm ở CSS (.reveal) nên không tranh với hover transform.
function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || visible) return undefined
    const observer = new IntersectionObserver(([entry]) => {
      // Phần tử đã nằm phía trên khung nhìn (nhảy thẳng tới neo #jobs) thì hiện luôn, không cần chờ cuộn ngược lên.
      if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible])

  return (
    <Tag
      ref={ref}
      className={`reveal${visible ? ' is-visible' : ''} ${className}`.trim()}
      style={{ '--reveal-delay': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export default Reveal
