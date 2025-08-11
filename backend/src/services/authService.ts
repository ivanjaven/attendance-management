import { supabase, supabaseAdmin } from "../config/database";
import {
  LoginRequest,
  LoginResponse,
  CreateUserRequest,
  UserRole,
  Admin,
  Teacher,
  Staff,
} from "../types/auth";

export class AuthService {
  /**
   * Admin login - authenticates and returns user with role data
   */
  static async login(loginData: LoginRequest): Promise<LoginResponse> {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: loginData.email,
          password: loginData.password,
        });

      if (authError || !authData.user) {
        throw new Error("Invalid email or password");
      }

      const user = await this.getUserWithRole(authData.user.id);

      if (!user) {
        throw new Error("User account not found");
      }

      if (user.status === "Inactive") {
        throw new Error("Account is inactive");
      }

      await this.updateLastLogin(authData.user.id);

      return {
        user,
        session: authData.session,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Admin creates new user account
   */
  static async createUser(
    userData: CreateUserRequest
  ): Promise<Admin | Teacher | Staff> {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true, // Skip email verification
        });

      if (authError || !authData.user) {
        throw new Error(`Failed to create user: ${authError?.message}`);
      }

      const { error: userError } = await supabaseAdmin.from("users").insert({
        auth_id: authData.user.id,
        type: userData.type,
        status: "Active",
      });

      if (userError) {
        // Cleanup: delete from Supabase auth if our table insert fails
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new Error(`Failed to create user record: ${userError.message}`);
      }
      await this.createRoleRecord(authData.user.id, userData);
      const user = await this.getUserWithRole(authData.user.id);
      if (!user) {
        throw new Error("Failed to retrieve created user");
      }

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(`Logout failed: ${error.message}`);
    }
  }

  /**
   * Get current user from session
   */
  static async getCurrentUser(): Promise<Admin | Teacher | Staff | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      return await this.getUserWithRole(user.id);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get user with role-specific data
   */
  private static async getUserWithRole(
    authId: string
  ): Promise<Admin | Teacher | Staff | null> {
    try {
      // Get user type first
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authId)
        .is("deleted_at", null)
        .single();

      if (userError || !userData) {
        return null;
      }

      // Get auth user data from the current session
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        return null;
      }

      const baseUser = {
        auth_id: authId,
        email: authUser.email!,
        type: userData.type,
        status: userData.status,
        last_login: userData.last_login
          ? new Date(userData.last_login)
          : undefined,
        deleted_at: userData.deleted_at
          ? new Date(userData.deleted_at)
          : undefined,
        created_at: new Date(userData.created_at),
        updated_at: new Date(userData.updated_at),
      };

      // Get role-specific data
      switch (userData.type) {
        case "Admin":
          return await this.getAdminData(baseUser);
        case "Teacher":
          return await this.getTeacherData(baseUser);
        case "Staff":
          return await this.getStaffData(baseUser);
        default:
          return null;
      }
    } catch (error) {
      return null;
    }
  }
  /**
   * Create role-specific record based on user type
   */
  private static async createRoleRecord(
    authId: string,
    userData: CreateUserRequest
  ): Promise<void> {
    switch (userData.type) {
      case "Admin":
        if (!userData.name) throw new Error("Admin name is required");
        const { error: adminError } = await supabaseAdmin
          .from("admins")
          .insert({
            auth_id: authId,
            name: userData.name,
          });
        if (adminError)
          throw new Error(
            `Failed to create admin record: ${adminError.message}`
          );
        break;

      case "Teacher":
        if (!userData.first_name || !userData.last_name) {
          throw new Error("Teacher first name and last name are required");
        }
        const { error: teacherError } = await supabaseAdmin
          .from("teachers")
          .insert({
            auth_id: authId,
            first_name: userData.first_name,
            last_name: userData.last_name,
            middle_name: userData.middle_name,
            advisory_level_id: userData.advisory_level_id,
            advisory_specialization_id: userData.advisory_specialization_id,
            advisory_section_id: userData.advisory_section_id,
          });
        if (teacherError)
          throw new Error(
            `Failed to create teacher record: ${teacherError.message}`
          );
        break;

      case "Staff":
        if (!userData.name) throw new Error("Staff name is required");
        const { error: staffError } = await supabaseAdmin.from("staff").insert({
          auth_id: authId,
          name: userData.name,
        });
        if (staffError)
          throw new Error(
            `Failed to create staff record: ${staffError.message}`
          );
        break;

      default:
        throw new Error("Invalid user type");
    }
  }

  /**
   * Get admin-specific data
   */
  private static async getAdminData(baseUser: any): Promise<Admin> {
    const { data: adminData, error } = await supabase
      .from("admins")
      .select("*")
      .eq("auth_id", baseUser.auth_id)
      .is("deleted_at", null)
      .single();

    if (error || !adminData) {
      throw new Error("Admin data not found");
    }

    return {
      ...baseUser,
      name: adminData.name,
    };
  }

  /**
   * Get teacher-specific data
   */
  private static async getTeacherData(baseUser: any): Promise<Teacher> {
    const { data: teacherData, error } = await supabase
      .from("teachers")
      .select("*")
      .eq("auth_id", baseUser.auth_id)
      .is("deleted_at", null)
      .single();

    if (error || !teacherData) {
      throw new Error("Teacher data not found");
    }

    return {
      ...baseUser,
      first_name: teacherData.first_name,
      last_name: teacherData.last_name,
      middle_name: teacherData.middle_name,
      advisory_level_id: teacherData.advisory_level_id,
      advisory_specialization_id: teacherData.advisory_specialization_id,
      advisory_section_id: teacherData.advisory_section_id,
    };
  }

  /**
   * Get staff-specific data
   */
  private static async getStaffData(baseUser: any): Promise<Staff> {
    const { data: staffData, error } = await supabase
      .from("staff")
      .select("*")
      .eq("auth_id", baseUser.auth_id)
      .is("deleted_at", null)
      .single();

    if (error || !staffData) {
      throw new Error("Staff data not found");
    }

    return {
      ...baseUser,
      name: staffData.name,
    };
  }

  /**
   * Update user's last login timestamp
   */
  private static async updateLastLogin(authId: string): Promise<void> {
    await supabase
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("auth_id", authId);
  }
}
