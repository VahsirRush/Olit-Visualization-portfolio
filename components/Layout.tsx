import type { ReactNode } from "react";

export function Part({ id, num, howto, children }: { id: string; num: number; howto?: ReactNode; children: ReactNode }) {
  return (
    <section className="part" aria-labelledby={id}>
      <div className="margin"><div className="num" aria-hidden="true">{num}</div>{howto && <p className="howto">{howto}</p>}</div>
      <div className="main">{children}</div>
    </section>
  );
}

export function Plate({ no, title, children, caption }: { no: number; title: string; children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="plate">
      <div className="cap-h"><span className="plate-no">Plate {no}</span><span className="cap-t">{title}</span></div>
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

export function Fig({ no, title, children, caption }: { no: number; title: string; children: ReactNode; caption?: ReactNode }) {
  return (
    <figure className="fig">
      <div className="cap-h"><span className="fig-no">Figure {no}</span><span className="cap-t">{title}</span></div>
      {children}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
