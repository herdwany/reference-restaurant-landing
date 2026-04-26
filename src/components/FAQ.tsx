import { useState } from "react";
import { CircleHelp, Minus, Plus } from "lucide-react";
import type { RestaurantConfig } from "../data/restaurantConfig";
import SectionTitle from "./SectionTitle";

interface FAQProps {
  config: RestaurantConfig;
}

export default function FAQ({ config }: FAQProps) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="section faq-section" id="faq">
      <div className="container">
        <SectionTitle title={config.ui.sectionTitles.faq} />
        <div className="faq-grid">
          {config.faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article className={`faq-item ${isOpen ? "faq-item--open" : ""}`} key={item.question}>
                <button type="button" onClick={() => setOpenIndex(isOpen ? -1 : index)} aria-expanded={isOpen}>
                  <span>
                    <CircleHelp size={19} />
                    {item.question}
                  </span>
                  {isOpen ? <Minus size={19} /> : <Plus size={19} />}
                </button>
                <div className="faq-item__answer">
                  <p>{item.answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
