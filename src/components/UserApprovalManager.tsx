import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PendingUser {
  id: string;
  user_id: string;
  role: string;
  approved: boolean;
  created_at: string;
  profile: {
    full_name: string;
    organization: string;
    position: string;
    email: string;
  } | null;
}

export const UserApprovalManager = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          *,
          profiles:user_id (
            full_name,
            organization,
            position,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (rolesError) throw rolesError;

      // Transform data to match interface
      const users = rolesData?.map((role: any) => ({
        ...role,
        profile: Array.isArray(role.profiles) ? role.profiles[0] : role.profiles
      })) || [];

      setPendingUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "데이터 로딩 실패",
        description: "사용자 목록을 불러오는 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!selectedUser || !actionType) return;

    try {
      if (actionType === "approve") {
        const { error } = await supabase
          .from("user_roles")
          .update({ approved: true, updated_at: new Date().toISOString() })
          .eq("id", selectedUser.id);

        if (error) throw error;

        toast({
          title: "승인 완료",
          description: "사용자가 승인되었습니다",
        });
      } else {
        // Reject - delete user_role and profile
        const { error: roleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("id", selectedUser.id);

        if (roleError) throw roleError;

        toast({
          title: "거부 완료",
          description: "사용자 신청이 거부되었습니다",
        });
      }

      fetchPendingUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "처리 실패",
        description: "사용자 처리 중 오류가 발생했습니다",
        variant: "destructive",
      });
    } finally {
      setSelectedUser(null);
      setActionType(null);
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
    <>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">사용자 승인 관리</h3>
          <p className="text-sm text-muted-foreground">
            가입 신청한 사용자를 승인하거나 거부할 수 있습니다
          </p>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>소속</TableHead>
                <TableHead>직함</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>신청일</TableHead>
                <TableHead className="text-right">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    등록된 사용자가 없습니다
                  </TableCell>
                </TableRow>
              ) : (
                pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.profile?.full_name || "-"}
                    </TableCell>
                    <TableCell>{user.profile?.organization || "-"}</TableCell>
                    <TableCell>{user.profile?.position || "-"}</TableCell>
                    <TableCell>{user.profile?.email || "-"}</TableCell>
                    <TableCell>
                      {user.approved ? (
                        <Badge className="bg-success">승인됨</Badge>
                      ) : (
                        <Badge variant="secondary">대기중</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!user.approved && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType("approve");
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            승인
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedUser(user);
                              setActionType("reject");
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            거부
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!selectedUser && !!actionType} onOpenChange={() => {
        setSelectedUser(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" ? "사용자 승인" : "신청 거부"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "approve"
                ? `${selectedUser?.profile?.full_name}님을 승인하시겠습니까? 승인 후 로그인이 가능합니다.`
                : `${selectedUser?.profile?.full_name}님의 신청을 거부하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction}>
              {actionType === "approve" ? "승인" : "거부"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
