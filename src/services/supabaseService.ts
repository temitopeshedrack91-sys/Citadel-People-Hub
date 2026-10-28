import { supabase } from '../utils/supabase/client';
import { TrellisTask } from '../components/trellis/types';

// ====================================================================
// AUTH SERVICE (Registration, Login, Session, Realtime User)
// ====================================================================
export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
}

export const authService = {
  async signUp(email: string, password: string, fullName?: string, role: string = 'Employee') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    if (error) throw error;

    if (data.user) {
      // Sync to profiles table as well
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName || email.split('@')[0],
        role,
        updated_at: new Date().toISOString(),
      });
    }

    return data;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return {
      id: user.id,
      email: user.email || '',
      fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0],
      role: profile?.role || user.user_metadata?.role || 'Employee',
    };
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        callback({
          id: session.user.id,
          email: session.user.email || '',
          fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          role: session.user.user_metadata?.role || 'Employee',
        });
      } else {
        callback(null);
      }
    });
  },
};

// ====================================================================
// TASKS SERVICE (Trellis Projects with Realtime Sync & Database Saves)
// ====================================================================
export const taskDbService = {
  async fetchTasks(): Promise<TrellisTask[]> {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching tasks from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      status: row.status,
      labels: row.labels || [],
      dueDate: row.due_date || '',
      dueTag: row.due_tag,
      assigneeId: row.assignee_id || '',
      assignerId: row.assigner_id || '',
      assignmentStatus: row.assignment_status || 'accepted',
      declineReason: row.decline_reason,
      reviewerId: row.reviewer_id,
      hours: row.hours || 8,
      prTag: row.pr_tag,
      imageUrl: row.image_url,
      progressFraction: row.progress_fraction,
      checklist: row.checklist || [],
      comments: row.comments || [],
      createdAt: row.created_at,
    }));
  },

  async upsertTask(task: TrellisTask) {
    const payload = {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      labels: task.labels,
      due_date: task.dueDate,
      due_tag: task.dueTag,
      assignee_id: task.assigneeId,
      assigner_id: task.assignerId,
      assignment_status: task.assignmentStatus,
      decline_reason: task.declineReason,
      reviewer_id: task.reviewerId,
      hours: task.hours,
      pr_tag: task.prTag,
      image_url: task.imageUrl,
      progress_fraction: task.progressFraction,
      checklist: task.checklist,
      comments: task.comments,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('tasks')
      .upsert(payload, { onConflict: 'id' })
      .select();

    if (error) {
      console.error('Failed to save task to Supabase:', error);
      throw error;
    }
    return data;
  },

  async deleteTask(taskId: string) {
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Failed to delete task in Supabase:', error);
      throw error;
    }
  },

  subscribeToTasks(onChange: (payload: any) => void) {
    const channel = supabase
      .channel('public:tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        (payload) => {
          onChange(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

// ====================================================================
// EMPLOYEES SERVICE (Realtime Directory & Database Sync)
// ====================================================================
export const employeeDbService = {
  async fetchEmployees() {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async upsertEmployee(employee: any) {
    const { data, error } = await supabase
      .from('employees')
      .upsert(employee, { onConflict: 'email' })
      .select();

    if (error) throw error;
    return data;
  },

  subscribeToEmployees(onChange: (payload: any) => void) {
    const channel = supabase
      .channel('public:employees-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        (payload) => onChange(payload)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};

// ====================================================================
// ATTENDANCE & LEAVE SERVICE
// ====================================================================
export const attendanceDbService = {
  async fetchAttendance() {
    const { data, error } = await supabase
      .from('attendance_records')
      .select('*')
      .order('clock_in', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async logClockIn(employeeId: number, employeeName: string, staffId: string) {
    const { data, error } = await supabase
      .from('attendance_records')
      .insert({
        employee_id: employeeId,
        employee_name: employeeName,
        employee_staff_id: staffId,
        clock_in: new Date().toISOString(),
        status: 'Present',
        verification_source: 'Web_Biometric',
      })
      .select();

    if (error) throw error;
    return data;
  },
};

export const leaveDbService = {
  async fetchLeaveRequests() {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async submitLeave(request: {
    employee_name: string;
    employee_staff_id: string;
    department_name: string;
    start_date: string;
    end_date: string;
    type: string;
    reason: string;
    days_requested: number;
  }) {
    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        ...request,
        status: 'Submitted',
        created_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;
    return data;
  },
};

// ====================================================================
// DOCUMENTS & STORAGE SERVICE (Supabase Storage Sync)
// ====================================================================
export const documentDbService = {
  async fetchDocuments() {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async uploadFile(bucket: string, path: string, file: File | Blob) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw error;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { ...data, publicUrl: urlData.publicUrl };
  },

  async saveDocumentRecord(doc: {
    title: string;
    category: string;
    file_size: string;
    mime_type: string;
    storage_path: string;
    download_url: string;
  }) {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        ...doc,
        uploaded_at: new Date().toISOString(),
      })
      .select();

    if (error) throw error;
    return data;
  },
};
