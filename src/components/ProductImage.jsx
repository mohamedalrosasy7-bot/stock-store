import { useEffect, useRef, useState } from 'react';
import { cloudinarySrcSet, cloudinaryUrl } from '../config';

export default function ProductImage({
  src,
  alt,
  className = '',
  cloudinaryWidth = 700,
  cloudinaryWidths = [480, 700],
  sizes = '100vw',
  ...rest
}) {
  const [state, setState] = useState('loading');
  const ref = useRef(null);

  useEffect(() => {
    // No src (product created without images in the admin panel) → show the
    // letter placeholder immediately instead of waiting for an error event.
    if (!src) { setState('error'); return; }
    setState('loading');
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setState('loaded');
  }, [src]);

  return (
    <div className={`pimg ${state} ${className}`}>
      {state !== 'error' && (
        <img
          ref={ref}
          src={cloudinaryUrl(src, { width: cloudinaryWidth })}
          srcSet={cloudinarySrcSet(src, cloudinaryWidths)}
          sizes={sizes}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          {...rest}
        />
      )}
      {state === 'error' && <span className="pimg-fallback">{(alt || 'M').charAt(0)}</span>}
    </div>
  );
}
