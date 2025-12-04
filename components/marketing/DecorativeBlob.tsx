export function DecorativeBlob({
  position = 'top-right',
  color = 'primary',
  size = 'large',
  blur = true
}: {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  color?: 'primary' | 'secondary' | 'accent';
  size?: 'small' | 'medium' | 'large';
  blur?: boolean;
}) {
  const positions = {
    'top-right': '-right-20 -top-20',
    'top-left': '-left-20 -top-20',
    'bottom-right': '-right-20 -bottom-20',
    'bottom-left': '-left-20 -bottom-20',
  };

  const colors = {
    primary: 'bg-[#174940]',
    secondary: 'bg-[#2D6A5F]',
    accent: 'bg-[#48A999]',
  };

  const sizes = {
    small: 'h-32 w-32',
    medium: 'h-48 w-48',
    large: 'h-64 w-64',
  };

  return (
    <div
      className={`absolute ${positions[position]} ${sizes[size]} ${colors[color]} rounded-full opacity-20 ${blur ? 'blur-3xl' : 'blur-2xl'}`}
      aria-hidden="true"
    />
  );
}
