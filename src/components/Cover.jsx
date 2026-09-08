import { useEffect, useRef, useState } from 'react'

const RATIO_CLASS = {
  '3/4': 'cover--3x4',
  '4/3': 'cover--4x3',
  '1/1': 'cover--1x1',
  '3/2': 'cover--3x2',
}

/**
 * An image slot.
 *
 * The `tint` is painted on the <figure> itself, so a slot whose file has not been
 * supplied yet renders as a solid editorial colour block rather than a broken
 * image icon. When the file does exist it fades in over the tint. That is what
 * lets the site ship complete before the photography lands — drop a JPEG at the
 * path in public/assets/images/ and it appears with no markup change.
 */
export default function Cover({
  tint,
  img,
  alt = '',
  ratio = '3/4',
  className = '',
  style,
  width,
  height,
  eager = false,
  children,
  ...rest
}) {
  const ref = useRef(null)
  const [state, setState] = useState('idle') // idle | loaded | failed

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // A cached image can finish before React attaches its handlers.
    if (el.complete) setState(el.naturalWidth > 0 ? 'loaded' : 'failed')
  }, [img])

  const ratioClass = RATIO_CLASS[ratio]

  return (
    <figure
      className={['cover', ratioClass, className].filter(Boolean).join(' ')}
      style={{
        '--tint': tint,
        ...(ratioClass ? null : { aspectRatio: ratio }),
        ...style,
      }}
      {...rest}
    >
      {img && state !== 'failed' && (
        <img
          ref={ref}
          className={`cover__img${state === 'loaded' ? ' is-loaded' : ''}`}
          src={img}
          alt={alt}
          width={width}
          height={height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          fetchpriority={eager ? 'high' : undefined}
          onLoad={() => setState('loaded')}
          onError={() => setState('failed')}
        />
      )}
      {children}
    </figure>
  )
}
