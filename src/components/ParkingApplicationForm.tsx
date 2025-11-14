import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ParkingApplicationFormProps {
  projectId: string;
}

interface CustomField {
  id: string;
  label: string;
  type: "text" | "number" | "tel" | "email";
  required: boolean;
}

export const ParkingApplicationForm = ({ projectId }: ParkingApplicationFormProps) => {
  const [carNumber, setCarNumber] = useState("");
  const [customFieldsEnabled, setCustomFieldsEnabled] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchCustomFields();
    }
  }, [projectId]);

  const fetchCustomFields = async () => {
    try {
      const { data, error } = await supabase
        .from("page_settings")
        .select("*")
        .eq("project_id", projectId)
        .in("setting_key", ["custom_fields_enabled", "custom_fields_config"]);

      if (error) throw error;

      if (data) {
        const enabledSetting = data.find((s) => s.setting_key === "custom_fields_enabled");
        const configSetting = data.find((s) => s.setting_key === "custom_fields_config");

        if (enabledSetting) setCustomFieldsEnabled(enabledSetting.setting_value === "true");
        if (configSetting) {
          try {
            const fields = JSON.parse(configSetting.setting_value);
            setCustomFields(fields);
            const initialValues: Record<string, string> = {};
            fields.forEach((field: CustomField) => {
              initialValues[field.id] = "";
            });
            setCustomFieldValues(initialValues);
          } catch {
            setCustomFields([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching custom fields:", error);
    }
  };

  const validateCarNumber = (number: string) => {
    // 한국 차량번호 형식: 00가0000 또는 000가0000
    const pattern = /^\d{2,3}[가-힣]\d{4}$/;
    return pattern.test(number);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateCarNumber(carNumber)) {
      toast({
        title: "올바르지 않은 차량번호",
        description: "차량번호 형식을 확인해주세요",
        variant: "destructive",
      });
      return;
    }

    // Validate required custom fields
    if (customFieldsEnabled) {
      for (const field of customFields) {
        if (field.required && !customFieldValues[field.id]?.trim()) {
          toast({
            title: "필수 항목 누락",
            description: `${field.label}을(를) 입력해주세요`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    setLoading(true);

    try {
      const lastFour = carNumber.slice(-4);

      const { error } = await supabase.from("parking_applications").insert({
        project_id: projectId,
        car_number: carNumber,
        last_four: lastFour,
        custom_fields: customFieldsEnabled ? customFieldValues : {},
      });

      if (error) throw error;

      toast({
        title: "신청 완료",
        description: "주차 등록이 신청되었습니다",
      });

      setCarNumber("");
      setCustomFieldValues(
        Object.keys(customFieldValues).reduce((acc, key) => {
          acc[key] = "";
          return acc;
        }, {} as Record<string, string>)
      );
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "신청 실패",
        description: "다시 시도해주세요",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {customFieldsEnabled && customFields.map((field) => (
        <div key={field.id}>
          <Label htmlFor={`custom-${field.id}`}>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </Label>
          <Input
            id={`custom-${field.id}`}
            type={field.type}
            placeholder={field.label}
            value={customFieldValues[field.id] || ""}
            onChange={(e) =>
              setCustomFieldValues({
                ...customFieldValues,
                [field.id]: e.target.value,
              })
            }
            required={field.required}
          />
        </div>
      ))}

      <div>
        <Label htmlFor="car-number">
          차량번호
          <span className="text-destructive ml-1">*</span>
        </Label>
        <Input
          id="car-number"
          placeholder="예: 12가3456"
          value={carNumber}
          onChange={(e) => setCarNumber(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            신청 중...
          </>
        ) : (
          "신청하기"
        )}
      </Button>
    </form>
  );
};