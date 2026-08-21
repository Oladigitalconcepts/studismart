// Renders an avatar stored in the private `avatars` bucket by resolving it to a
// short-lived signed URL. Renders nothing (so the caller's fallback shows) when
// there is no avatar or the URL cannot be signed.
import { useEffect, useState } from "react";
import { getAvatarUrl } from "@/lib/avatars";

type Props = { value: string | null | undefined; alt: string; className?: string };

export const AvatarImg = ({ value, alt, className }: Props) => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    getAvatarUrl(value).then((url) => { if (!cancelled) setSrc(url); });
    return () => { cancelled = true; };
  }, [value]);

  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
};

export default AvatarImg;
