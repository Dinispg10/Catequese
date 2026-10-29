interface Option {
  value: string;
  label: string;
}

interface ChipSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

/** Filtro compacto em forma de "pílula": fica destacado quando tem um valor escolhido. */
export default function ChipSelect({ label, value, onChange, options, placeholder = 'Todos' }: ChipSelectProps) {
  return (
    <label className={`chip${value ? ' chip--active' : ''}`}>
      <span className="chip-label">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
