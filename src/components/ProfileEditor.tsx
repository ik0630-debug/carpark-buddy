import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Profile {
  full_name: string;
  organization: string;
  position: string;
  email: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ProfileEditor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    organization: "",
    position: "",
    email: "",
  });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          full_name: data.full_name,
          organization: data.organization,
          position: data.position,
          email: data.email,
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "데이터 로딩 실패",
        description: "프로필 정보를 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!profile.full_name.trim() || !profile.organization.trim() || !profile.position.trim()) {
      toast({
        title: "입력 오류",
        description: "모든 필드를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name.trim(),
          organization: profile.organization.trim(),
          position: profile.position.trim(),
          email: profile.email.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "저장 완료",
        description: "프로필이 업데이트되었습니다",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "저장 실패",
        description: "프로필 업데이트 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "입력 오류",
        description: "새 비밀번호를 입력해주세요",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "입력 오류",
        description: "새 비밀번호가 일치하지 않습니다",
        variant: "destructive",
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "입력 오류",
        description: "비밀번호는 최소 6자 이상이어야 합니다",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;

      toast({
        title: "변경 완료",
        description: "비밀번호가 성공적으로 변경되었습니다",
      });

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      toast({
        title: "변경 실패",
        description: "비밀번호 변경 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>내 프로필</CardTitle>
          <CardDescription>개인 정보를 수정할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">이름</Label>
              <Input
                id="fullName"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="홍길동"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">소속</Label>
              <Input
                id="organization"
                value={profile.organization}
                onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                placeholder="㈜엠앤씨커뮤니케이션즈"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">직함</Label>
              <Input
                id="position"
                value={profile.position}
                onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                placeholder="대리"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="admin@example.com"
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>비밀번호 변경</CardTitle>
          <CardDescription>계정 보안을 위해 비밀번호를 변경할 수 있습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">새 비밀번호</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="최소 6자 이상"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="비밀번호 재입력"
                required
              />
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              비밀번호 변경
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
