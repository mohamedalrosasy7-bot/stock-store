import { Link } from 'react-router-dom';
import { discountPercent, productImages } from '../data/products';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { useLang } from '../context/LangContext';
import ProductImage from './ProductImage';
import Price from './Price';
import { BagIcon, HeartIcon } from './Icons';
import { hasAvailableVariant } from '../data/variantAvailability';
import { cloudinaryUrl } from '../config';

export default function ProductCard({ product }) {
  const { has, toggle } = useWishlist();
  const toast = useToast();
  const { t } = useLang();
  const pct = discountPercent(product);
  const gallery = productImages(product);
  const wished = has(product.id);
  const link = `/product/${product.id}`;
  const soldOut = product.soldOut === true;
  const noAvailableVariant = soldOut || !hasAvailableVariant(product);

  return (
    <article className={`card ${noAvailableVariant ? 'is-sold-out' : ''}`}>
      <div className="card-media">
        <Link to={link} aria-label={product.name}>
          <ProductImage src={cloudinaryUrl(gallery[0] || '', 'card')} alt={product.name} />
          {gallery[1] && (
            <img
              className="card-alt"
              src={cloudinaryUrl(gallery[1], 'card')}
              alt=""
              aria-hidden="true"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}
        </Link>
        <div className="badges">
          {pct > 0 && <span className="badge badge-sale">-{pct}%</span>}
          {noAvailableVariant && <span className="badge badge-sold-out">{t('admin.soldOut')}</span>}
        </div>
        <button
          className={`wish ${wished ? 'on' : ''}`}
          onClick={() => {
            toggle(product.id);
            toast(wished ? 'product.removedWishlist' : 'product.savedWishlist', wished ? 'wishlist-remove' : 'wishlist');
          }}
          aria-pressed={wished}
          aria-label={wished ? t('product.removeWishlist') : t('product.addWishlist')}
        >
          <HeartIcon filled={wished} size={18} />
        </button>
      </div>

      <div className="card-body">
        <Link to={link} className="card-title">{product.name}</Link>
        <Price product={product} />

        <Link className="btn btn-full" to={`${link}#pick`}>
          <BagIcon size={16} /> {noAvailableVariant ? t('admin.soldOut') : t('product.addToCart')}
        </Link>
      </div>
    </article>
  );
}
