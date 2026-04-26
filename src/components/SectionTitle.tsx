interface SectionTitleProps {
  title: string;
  eyebrow?: string;
}

export default function SectionTitle({ title, eyebrow }: SectionTitleProps) {
  return (
    <div className="section-title">
      {eyebrow ? <span className="section-title__eyebrow">{eyebrow}</span> : null}
      <div className="section-title__row">
        <span aria-hidden="true" />
        <h2>{title}</h2>
        <span aria-hidden="true" />
      </div>
    </div>
  );
}
