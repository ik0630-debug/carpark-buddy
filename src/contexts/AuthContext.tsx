import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";

type UserRole = "master" | "user" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole;
  projectId: string | null;
  loading: boolean;
  signInMaster: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInUser: (projectId: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 세션 복원
    const storedRole = localStorage.getItem("userRole") as UserRole;
    const storedProjectId = localStorage.getItem("userProjectId");
    
    if (storedRole === "user" && storedProjectId) {
      setRole(storedRole);
      setProjectId(storedProjectId);
      setLoading(false);
      return;
    }

    // 마스터 세션 체크
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // 마스터 권한 체크
          setTimeout(async () => {
            const { data } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id)
              .eq("role", "master")
              .maybeSingle();
            
            if (data) {
              setRole("master");
              localStorage.setItem("userRole", "master");
            }
          }, 0);
        } else {
          setRole(null);
          localStorage.removeItem("userRole");
          localStorage.removeItem("userProjectId");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "master")
          .maybeSingle()
          .then(({ data }) => {
            if (data) {
              setRole("master");
              localStorage.setItem("userRole", "master");
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInMaster = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 마스터 권한 및 승인 상태 체크
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, approved")
        .eq("user_id", data.user.id)
        .eq("role", "master")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        throw new Error("관리자 권한이 없습니다");
      }

      if (!roleData.approved) {
        await supabase.auth.signOut();
        throw new Error("아직 승인되지 않은 계정입니다. 관리자의 승인을 기다려주세요.");
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInUser = async (projectId: string, password: string) => {
    try {
      // 프로젝트 비밀번호 확인
      const { data, error } = await supabase
        .from("projects")
        .select("password")
        .eq("id", projectId)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("프로젝트를 찾을 수 없습니다");
      if (!data.password) throw new Error("이 프로젝트는 비밀번호가 설정되지 않았습니다");
      if (data.password !== password) throw new Error("비밀번호가 일치하지 않습니다");

      setRole("user");
      setProjectId(projectId);
      localStorage.setItem("userRole", "user");
      localStorage.setItem("userProjectId", projectId);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    if (role === "master") {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setRole(null);
    setProjectId(null);
    localStorage.removeItem("userRole");
    localStorage.removeItem("userProjectId");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        projectId,
        loading,
        signInMaster,
        signInUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
