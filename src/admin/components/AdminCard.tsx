import type { ElementType, HTMLAttributes, ReactNode } from "react";

type AdminCardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
};

export default function AdminCard({ as: Component = "section", children, className = "", ...props }: AdminCardProps) {
  return (
    <Component className={`admin-card ${className}`.trim()} {...props}>
      {children}
    </Component>
  );
}
