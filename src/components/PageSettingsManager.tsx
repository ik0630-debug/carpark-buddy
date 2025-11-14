import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PageSettingsManagerProps {
  projectId: string;
}

interface CustomField {
  id: string;
  label: string;
  type: "text" | "number" | "tel" | "email" | "select";
  required: boolean;
  options?: string[];
}

export const PageSettingsManager = ({ projectId }: PageSettingsManagerProps) => {
  const [titleText, setTitleText] = useState("");
  const [fontSize, setFontSize] = useState("36");
  const [customFieldsEnabled, setCustomFieldsEnabled] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      fetchSettings();
    }
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("page_settings")
        .select("*")
        .eq("project_id", projectId)
        .in("setting_key", ["title_text", "title_font_size", "custom_fields_enabled", "custom_fields_config"]);

      if (error) throw error;

      if (data) {
        const titleSetting = data.find((s) => s.setting_key === "title_text");
        const fontSizeSetting = data.find((s) => s.setting_key === "title_font_size");
        const customFieldsEnabledSetting = data.find((s) => s.setting_key === "custom_fields_enabled");
        const customFieldsConfigSetting = data.find((s) => s.setting_key === "custom_fields_config");

        if (titleSetting) setTitleText(titleSetting.setting_value);
        if (fontSizeSetting) setFontSize(fontSizeSetting.setting_value);
        if (customFieldsEnabledSetting) setCustomFieldsEnabled(customFieldsEnabledSetting.setting_value === "true");
        if (customFieldsConfigSetting) {
          try {
            setCustomFields(JSON.parse(customFieldsConfigSetting.setting_value));
          } catch {
            setCustomFields([]);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "설정 로딩 실패",
        description: "설정을 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      // Update title text
      const { error: titleError } = await supabase
        .from("page_settings")
        .update({ setting_value: titleText })
        .eq("project_id", projectId)
        .eq("setting_key", "title_text");

      if (titleError) throw titleError;

      // Update font size
      const { error: fontError } = await supabase
        .from("page_settings")
        .update({ setting_value: fontSize })
        .eq("project_id", projectId)
        .eq("setting_key", "title_font_size");

      if (fontError) throw fontError;

      // Update custom fields enabled
      const { error: customFieldsEnabledError } = await supabase
        .from("page_settings")
        .update({ setting_value: customFieldsEnabled.toString() })
        .eq("project_id", projectId)
        .eq("setting_key", "custom_fields_enabled");

      if (customFieldsEnabledError) throw customFieldsEnabledError;

      // Update custom fields config
      const { error: customFieldsConfigError } = await supabase
        .from("page_settings")
        .update({ setting_value: JSON.stringify(customFields) })
        .eq("project_id", projectId)
        .eq("setting_key", "custom_fields_config");

      if (customFieldsConfigError) throw customFieldsConfigError;

      toast({
        title: "저장 완료",
        description: "페이지 설정이 저장되었습니다",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "저장 실패",
        description: "설정 저장 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    setCustomFields([
      ...customFields,
      {
        id: Date.now().toString(),
        label: "",
        type: "text",
        required: false,
        options: [],
      },
    ]);
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter((field) => field.id !== id));
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setCustomFields(
      customFields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      )
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title-text">페이지 제목</Label>
          <Textarea
            id="title-text"
            placeholder="제목을 입력하세요 (줄바꿈으로 여러 줄 가능)"
            value={titleText}
            onChange={(e) => setTitleText(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            Enter 키로 줄바꿈이 가능합니다
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="font-size">폰트 크기 (px)</Label>
          <Input
            id="font-size"
            type="number"
            min="12"
            max="100"
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
          />
        </div>

        <div className="border rounded-lg p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground mb-2">미리보기:</p>
          <div
            className="font-bold text-primary text-center whitespace-pre-line"
            style={{ fontSize: `${fontSize}px` }}
          >
            {titleText}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="custom-fields">추가 입력 필드</Label>
            <p className="text-sm text-muted-foreground">
              참가자 이름, 구분 등 추가 정보를 수집할 수 있습니다
            </p>
          </div>
          <Switch
            id="custom-fields"
            checked={customFieldsEnabled}
            onCheckedChange={setCustomFieldsEnabled}
          />
        </div>

        {customFieldsEnabled && (
          <div className="space-y-3">
            {customFields.map((field) => (
              <div key={field.id} className="flex gap-2 items-start border rounded-lg p-3 bg-background">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="필드 이름 (예: 참가자 이름)"
                    value={field.label}
                    onChange={(e) =>
                      updateCustomField(field.id, { label: e.target.value })
                    }
                  />
                  <div className="flex gap-2">
                    <Select
                      value={field.type}
                      onValueChange={(value: any) =>
                        updateCustomField(field.id, { type: value, options: value === "select" ? [] : undefined })
                      }
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="입력 형식" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">텍스트</SelectItem>
                        <SelectItem value="number">숫자</SelectItem>
                        <SelectItem value="tel">전화번호</SelectItem>
                        <SelectItem value="email">이메일</SelectItem>
                        <SelectItem value="select">선택(드롭다운)</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={field.required}
                        onCheckedChange={(checked) =>
                          updateCustomField(field.id, { required: checked })
                        }
                      />
                      <Label className="text-sm">필수</Label>
                    </div>
                  </div>
                  
                  {field.type === "select" && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm">선택 옵션</Label>
                      {(field.options || []).map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`옵션 ${index + 1} (예: VIP, 스텝)`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(field.options || [])];
                              newOptions[index] = e.target.value;
                              updateCustomField(field.id, { options: newOptions });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newOptions = (field.options || []).filter((_, i) => i !== index);
                              updateCustomField(field.id, { options: newOptions });
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateCustomField(field.id, { options: [...(field.options || []), ""] });
                        }}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        옵션 추가
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCustomField(field.id)}
                  className="mt-1"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addCustomField}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              필드 추가
            </Button>
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            저장 중...
          </>
        ) : (
          "설정 저장"
        )}
      </Button>
    </div>
  );
};