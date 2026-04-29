import {
  createContext,
  createSignal,
  onMount,
  useContext,
  type ParentComponent,
} from "solid-js";
import type { User, NullableUser } from "../types/user";
import { makeApiCall, parseApiResponse } from "../utils/api";

interface AuthStore {
  user: () => NullableUser;
  login: (username: string, password: string) => Promise<NullableUser>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  isInitialized: () => boolean;
  getToken: () => string | null;
  updateUser: (userData: User | null) => void;
}

const AuthContext = createContext<AuthStore>();

const createAuthStore = (): AuthStore => {
  const [user, setUser] = createSignal<User | null>(null);
  const [isInitialized, setIsInitialized] = createSignal(false);

  const updateUser = (userData: User | null) => {
    setUser(userData);
    if (typeof window !== "undefined") {
      if (userData) {
        sessionStorage.setItem("user", JSON.stringify(userData));
      } else {
        sessionStorage.removeItem("user");
      }
    }
  };

  // Function to verify the current session
  const verifySession = async (savedUser: NullableUser) => {
    try {
      setIsInitialized(false);

      const token = savedUser?.token;
      if (!token) {
        console.log("No token available for session verification");
        updateUser(null);
        return;
      }

      const response = await makeApiCall(
        "/api/auth/verify",
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        },
        token
      );

      const { data } = await parseApiResponse<{ valid: boolean; user?: User }>(
        response,
        "verify-session"
      );

      if (data.valid && data.user) {
        console.log("Session verified:", data.user);
        updateUser({
          ...data.user,
          token: data.user.token || savedUser?.token,
        });
      } else {
        console.log("No valid session found");
        updateUser(null);
        // Clear any stale session data
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("user");
        }
      }
    } catch (error) {
      console.error("Session verification error:", error);
      updateUser(null);
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("user");
      }
    } finally {
      setIsInitialized(true);
    }
  };

  // Function to get cookie value
  const getCookie = (name: string): string | null => {
    if (typeof window === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  };

  // Initialize auth state once on mount
  onMount(async () => {
    if (typeof window === "undefined") {
      return;
    }

    // Check for auth-token cookie first
    const authToken = getCookie('auth-token');

    if (authToken) {
      try {
        // Verify the token with the server
        const response = await makeApiCall("/api/auth/verify", {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }, authToken);

        const { data } = await parseApiResponse<{ valid: boolean; user?: User }>(
          response,
          "verify-session"
        );

        if (data.valid && data.user) {
          console.log("Session verified from cookie:", data.user);
          updateUser({
            ...data.user,
            token: authToken,
          });
        } else {
          console.log("Invalid token from cookie");
          updateUser(null);
        }
      } catch (error) {
        console.error("Token verification failed:", error);
        updateUser(null);
      }
    } else {
      // Check for saved user in sessionStorage (fallback)
      const savedUser = sessionStorage.getItem("user");
      
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          const userData = parsed.user || parsed;

          if (userData && typeof userData === "object" && userData.id) {
            updateUser(userData);
          } else {
            sessionStorage.removeItem("user");
          }
        } catch (error) {
          updateUser(null);
          sessionStorage.removeItem("user");
        }
      }
    }

    // Mark as initialized
    setIsInitialized(true);
  });

  const login = async (username: string, password: string) => {
    try {
      const response = await makeApiCall("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const { data } = await parseApiResponse<{ user: User }>(
        response,
        "login"
      );

      if (!data.user) {
        throw new Error("Invalid server response: missing user data");
      }

      updateUser(data.user);
      return data.user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = getToken();

      // Then proceed with normal logout
      if (token) {
        const response = await makeApiCall(
          "/api/auth/logout",
          {
            method: "POST",
          },
          token
        );

        await parseApiResponse(response, "logout");
      }

      // Clear the user from local storage and state
      updateUser(null);

      // Force a full page reload to clear any application state
      window.location.href = "/";
    } catch (error) {
      // Even if the API call fails, clear the user from state
      updateUser(null);
      window.location.href = "/";
    }
  };

  // Add method to get the current auth token
  const getToken = (): string | null => {
    const currentUser = user();
    return currentUser?.token || null;
  };

  const deleteAccount = async () => {
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await makeApiCall(
        "/api/auth/delete",
        {
          method: "DELETE",
          body: JSON.stringify({}),
        },
        token
      );

      await parseApiResponse(response, "delete-account");
      
      // Clear user data and redirect
      updateUser(null);
      window.location.href = "/";
    } catch (error) {
      console.error("Delete account error:", error);
      throw error;
    }
  };

  return {
    user,
    login,
    logout,
    deleteAccount,
    isInitialized,
    getToken,
    updateUser,
  };
};

export const AuthProvider: ParentComponent = (props) => (
  <AuthContext.Provider value={createAuthStore()}>
    {props.children}
  </AuthContext.Provider>
);

export const useAuth = (): AuthStore => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
