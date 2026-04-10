import { Select, Typography } from "antd";

const { Text } = Typography;

const DESIGN_OPTIONS = [
  { label: "Design 1", value: "one" },
  { label: "Design 2", value: "two" },
  { label: "Design 3", value: "three" },
  { label: "Design 4", value: "four" },
  { label: "Design 5", value: "five" },
];

function CardSwitcher({ design, onDesignChange }) {

  return (
    <div className="mb-6 flex flex-col items-center gap-2">
      <Text strong>Select card design</Text>
      <Select
        value={design}
        onChange={onDesignChange}
        style={{ width: 220 }}
        options={DESIGN_OPTIONS}
      />
    </div>
  );
}

export default CardSwitcher;