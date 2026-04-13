import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Loader2, Rocket } from "lucide-react";

interface FieldDef {
  name: string;
  label: string;
  tooltip: string;
  placeholder: string;
  type: "number";
}

const fields: FieldDef[] = [
  { name: "mission_cost", label: "Mission Cost ($B)", tooltip: "Total mission cost in billion USD", placeholder: "5.0", type: "number" },
  { name: "fuel_consumption", label: "Fuel Consumption (tons)", tooltip: "Total fuel consumption in metric tons", placeholder: "200", type: "number" },
  { name: "payload_weight", label: "Payload Weight (tons)", tooltip: "Total payload weight in metric tons", placeholder: "50", type: "number" },
  { name: "crew_size", label: "Crew Size", tooltip: "Number of crew members (0 for unmanned)", placeholder: "4", type: "number" },
  { name: "mission_duration", label: "Duration (years)", tooltip: "Expected mission duration in years", placeholder: "2.5", type: "number" },
  { name: "distance", label: "Distance (light-years)", tooltip: "Distance from Earth in light-years", placeholder: "0.5", type: "number" },
];

const PredictionForm = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (name: string, val: string) => {
    setValues((prev) => ({ ...prev, [name]: val }));
    setError(null);
  };

  const handlePredict = async () => {
    // Validate
    for (const f of fields) {
      const v = values[f.name];
      if (!v || isNaN(Number(v)) || Number(v) < 0) {
        setError(`Please enter a valid value for ${f.label}`);
        return;
      }
      if (f.name !== "crew_size" && Number(v) <= 0) {
        setError(`${f.label} must be greater than 0`);
        return;
      }
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const body: Record<string, number> = {};
      fields.forEach((f) => {
        body[f.name] = f.name === "crew_size" ? parseInt(values[f.name]) : parseFloat(values[f.name]);
      });

      const res = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Prediction failed");
      const data = await res.json();
      setResult(data.predicted_success_percent);
    } catch {
      setError("Could not reach prediction API. Make sure the backend is running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        {fields.map((f) => (
          <div key={f.name} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={f.name} className="text-sm font-medium text-foreground">{f.label}</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="bg-card border-border">
                  <p className="text-xs">{f.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Input
              id={f.name}
              type="number"
              placeholder={f.placeholder}
              value={values[f.name] || ""}
              onChange={(e) => handleChange(f.name, e.target.value)}
              className="bg-muted border-border focus:ring-primary"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Button
        onClick={handlePredict}
        disabled={loading}
        className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 animate-pulse-glow"
        size="lg"
      >
        {loading ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing Mission...</>
        ) : (
          <><Rocket className="mr-2 h-5 w-5" /> Predict Success</>
        )}
      </Button>

      {result !== null && (
        <div className="mt-8 rounded-xl border p-8 text-center glow-border-cyan animate-fade-in bg-card">
          <p className="text-sm text-muted-foreground mb-2">Predicted Mission Success</p>
          <p className="text-6xl font-bold gradient-text">{result}%</p>
          <p className="text-sm text-muted-foreground mt-3">
            {result >= 80 ? "🟢 High probability of success" : result >= 50 ? "🟡 Moderate risk" : "🔴 High risk mission"}
          </p>
        </div>
      )}
    </div>
  );
};

export default PredictionForm;
