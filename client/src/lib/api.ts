/**
 * PeoplePay360 - Frontend API Client
 * Connects React Vite UI to the Express backend API.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem('peoplepay_token');
  }

  setToken(token: string | null) {
    if (token) {
      localStorage.setItem('peoplepay_token', token);
    } else {
      localStorage.removeItem('peoplepay_token');
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const isFormData = options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...((options.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const csrfCookie = document.cookie
      .split('; ')
      .find((cookie) => cookie.startsWith('csrfToken='))
      ?.split('=')[1];
    if (csrfCookie && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
      headers['X-CSRF-Token'] = decodeURIComponent(csrfCookie);
    }

    const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage =
        data?.error?.message || data?.message || `Request failed with status ${response.status}`;
      const errorCode = data?.error?.code || 'API_ERROR';
      const error = new Error(errorMessage) as Error & { code?: string; status: number };
      error.code = errorCode;
      error.status = response.status;

      // Handle unauthenticated state
      if (response.status === 401) {
        this.setToken(null);
      }

      throw error;
    }

    return data?.data ?? data;
  }

  // ==========================================
  // AUTHENTICATION MODULE
  // ==========================================
  auth = {
    login: async (email: string, password: string) => {
      const data = await this.request<{
        token: string;
        user: {
          id: string;
          email: string;
          role: string;
          employeeId: string | null;
          employee?: {
            id: string;
            firstName: string;
            lastName: string;
            department?: { name: string };
            jobPosition?: { title: string };
          };
        };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data?.token) {
        this.setToken(data.token);
      }
      return data;
    },

    getMe: async () => {
      return await this.request<{
        id: string;
        email: string;
        role: string;
        employeeId: string | null;
        employee?: {
          id: string;
          firstName: string;
          lastName: string;
          department?: { name: string };
          jobPosition?: { title: string };
        };
      }>('/auth/me');
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
      return await this.request('/auth/change-password', {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },

    logout: async () => {
      try {
        await this.request('/auth/logout', { method: 'POST' });
      } finally {
        this.setToken(null);
      }
    },
  };

  // ==========================================
  // EMPLOYEE MASTER MODULE
  // ==========================================
  employees = {
    getAll: async (params: {
      view?: 'list' | 'kanban';
      groupBy?: 'status' | 'departmentId';
      departmentId?: string;
      status?: 'ACTIVE' | 'INACTIVE';
      search?: string;
      page?: number;
      limit?: number;
    } = {}) => {
      const searchParams = new URLSearchParams();
      if (params.view) searchParams.append('view', params.view);
      if (params.groupBy) searchParams.append('groupBy', params.groupBy);
      if (params.departmentId) searchParams.append('departmentId', params.departmentId);
      if (params.status) searchParams.append('status', params.status);
      if (params.search) searchParams.append('search', params.search);
      if (params.page) searchParams.append('page', String(params.page));
      if (params.limit) searchParams.append('limit', String(params.limit));

      const query = searchParams.toString();
      return await this.request<any>(`/employees${query ? `?${query}` : ''}`);
    },

    getById: async (id: string) => {
      return await this.request<any>(`/employees/${id}`);
    },

    create: async (data: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
      bankAccount?: string;
      departmentId?: string;
      jobPositionId?: string;
      managerId?: string;
      workingScheduleId?: string;
      issueLogin?: boolean;
      role?: string;
      password?: string;
      image?: File;
    }) => {
      return await this.request<any>('/employees', {
        method: 'POST',
      body: data.image ? (() => { const form = new FormData(); Object.entries(data).forEach(([key, value]) => value !== undefined && value !== null && form.append(key, value instanceof File ? value : String(value))); return form; })() : JSON.stringify(data),
      });
    },

    update: async (id: string, data: Record<string, any>) => {
      return await this.request<any>(`/employees/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string) => {
      return await this.request<any>(`/employees/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // ==========================================
  // DEPARTMENTS MODULE
  // ==========================================
  departments = {
    getAll: async () => {
      return await this.request<
        Array<{
          id: string;
          name: string;
          employeeCount: number;
          createdAt: string;
          updatedAt: string;
        }>
      >('/departments');
    },

    create: async (name: string) => {
      return await this.request<any>('/departments', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    },

    update: async (id: string, name: string) => {
      return await this.request<any>(`/departments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
    },

    delete: async (id: string) => {
      return await this.request<any>(`/departments/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // ==========================================
  // JOB POSITIONS MODULE
  // ==========================================
  jobPositions = {
    getAll: async (departmentId?: string) => {
      const query = departmentId ? `?departmentId=${departmentId}` : '';
      return await this.request<
        Array<{
          id: string;
          title: string;
          departmentId: string | null;
          department?: { id: string; name: string };
          employeeCount: number;
        }>
      >(`/job-positions${query}`);
    },

    create: async (title: string, departmentId?: string) => {
      return await this.request<{
        id: string;
        title: string;
        departmentId: string | null;
        department?: { id: string; name: string };
        employeeCount: number;
      }>('/job-positions', {
        method: 'POST',
        body: JSON.stringify({ title, departmentId: departmentId || null }),
      });
    },

    update: async (id: string, data: { title?: string; departmentId?: string | null }) => {
      return await this.request<any>(`/job-positions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },

    delete: async (id: string) => {
      return await this.request<any>(`/job-positions/${id}`, {
        method: 'DELETE',
      });
    },
  };

  workingSchedules = {
    getAll: async () => this.request<any[]>('/working-schedules'),
    getById: async (id: string) => this.request<any>(`/working-schedules/${id}`),
    create: async (data: { name: string; type: 'FULL_TIME' | 'PART_TIME'; lines: Array<{ day: string; startTime: string; endTime: string; breakMinutes: number }> }) =>
      this.request<any>('/working-schedules', { method: 'POST', body: JSON.stringify(data) }),
    update: async (id: string, data: any) => this.request<any>(`/working-schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: async (id: string) => this.request<any>(`/working-schedules/${id}`, { method: 'DELETE' }),
    setArchived: async (id: string, isArchived: boolean) =>
      this.request<any>(`/working-schedules/${id}`, { method: 'PATCH', body: JSON.stringify({ isArchived }) }),
  };

  // ==========================================
  // ATTENDANCE MODULE
  // ==========================================
  attendance = {
    getTodayStatus: async () =>
      this.request<{
        hasEmployeeProfile: boolean;
        checkedIn: boolean;
        isCompleted: boolean;
        attendance: any | null;
        elapsedSeconds: number;
        todayTotalHours: number;
      }>('/attendance/today-status'),

    checkIn: async (employeeId?: string) =>
      this.request<any>('/attendance/check-in', {
        method: 'POST',
        body: JSON.stringify(employeeId ? { employeeId } : {}),
      }),

    checkOut: async (id?: string, employeeId?: string) => {
      const endpoint = id ? `/attendance/${id}/check-out` : '/attendance/check-out';
      const method = id ? 'PATCH' : 'POST';
      return this.request<any>(endpoint, {
        method,
        body: JSON.stringify(employeeId ? { employeeId } : {}),
      });
    },

    getAll: async (params?: {
      employeeId?: string;
      from?: string;
      to?: string;
      status?: string;
      today?: boolean;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
      if (params?.from) searchParams.set('from', params.from);
      if (params?.to) searchParams.set('to', params.to);
      if (params?.status) searchParams.set('status', params.status);
      if (params?.today !== undefined) searchParams.set('today', String(params.today));

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/attendance?${queryString}` : '/attendance';
      return this.request<any[]>(endpoint);
    },

    getById: async (id: string) => this.request<any>(`/attendance/${id}`),

    correct: async (
      id: string,
      data: {
        checkIn?: string | null;
        checkOut?: string | null;
        workedHours?: number | null;
        status?: string;
        correctionNote: string;
      }
    ) =>
      this.request<any>(`/attendance/${id}/correct`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  };

  // ==========================================
  // CONTRACTS MODULE
  // ==========================================
  contracts = {
    getAll: async (params?: { employeeId?: string; status?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.employeeId) searchParams.set('employeeId', params.employeeId);
      if (params?.status && params.status !== 'ALL') searchParams.set('status', params.status);
      if (params?.search) searchParams.set('search', params.search);

      const queryString = searchParams.toString();
      const endpoint = queryString ? `/contracts?${queryString}` : '/contracts';
      return this.request<any[]>(endpoint);
    },

    getById: async (id: string) => this.request<any>(`/contracts/${id}`),

    getLookupOptions: async () =>
      this.request<{
        salaryStructures: Array<{ id: string; name: string; isActive: boolean }>;
        workingSchedules: Array<{ id: string; name: string; type: string }>;
      }>('/contracts/meta/lookup'),

    create: async (data: {
      employeeId: string;
      departmentId?: string | null;
      jobPositionId?: string | null;
      workingScheduleId?: string | null;
      salaryStructureId: string;
      startDate: string;
      endDate?: string | null;
      wage: number;
    }) =>
      this.request<any>('/contracts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: async (
      id: string,
      data: {
        departmentId?: string | null;
        jobPositionId?: string | null;
        workingScheduleId?: string | null;
        salaryStructureId?: string;
        startDate?: string;
        endDate?: string | null;
        wage?: number;
      }
    ) =>
      this.request<any>(`/contracts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    activate: async (id: string) =>
      this.request<any>(`/contracts/${id}/activate`, {
        method: 'PATCH',
      }),

    cancel: async (id: string) =>
      this.request<any>(`/contracts/${id}/cancel`, {
        method: 'PATCH',
      }),

    archive: async (id: string) =>
      this.request<any>(`/contracts/${id}`, {
        method: 'DELETE',
      }),
  };

  // ==========================================
  // SALARY STRUCTURES & RULES MODULE
  // ==========================================
  salaryStructures = {
    getAll: async (params?: { includeInactive?: boolean }) => {
      const q = params?.includeInactive ? '?includeInactive=true' : '';
      return this.request<any[]>(`/salary-structures${q}`);
    },

    getById: async (id: string) =>
      this.request<any>(`/salary-structures/${id}`),

    create: async (data: { name: string; isActive?: boolean }) =>
      this.request<any>('/salary-structures', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: async (id: string, data: { name?: string; isActive?: boolean }) =>
      this.request<any>(`/salary-structures/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: async (id: string) =>
      this.request<any>(`/salary-structures/${id}`, {
        method: 'DELETE',
      }),

    getRules: async (structureId: string) =>
      this.request<any[]>(`/salary-structures/${structureId}/rules`),

    createRule: async (
      structureId: string,
      data: {
        name: string;
        code: string;
        category: string;
        sequence: number;
        computationMethod: 'FIXED' | 'PERCENTAGE';
        fixedAmount?: number | null;
        percentage?: number | null;
        baseRuleId?: string | null;
      }
    ) =>
      this.request<any>(`/salary-structures/${structureId}/rules`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  };

  salaryRules = {
    getAll: async (params?: { structureId?: string }) => {
      const query = params?.structureId ? `?structureId=${encodeURIComponent(params.structureId)}` : '';
      return this.request<any[]>(`/salary-rules${query}`);
    },

    create: async (
      structureId: string,
      data: {
        name: string;
        code: string;
        category: string;
        sequence: number;
        computationMethod: 'FIXED' | 'PERCENTAGE';
        fixedAmount?: number | null;
        percentage?: number | null;
        baseRuleId?: string | null;
      }
    ) =>
      this.request<any>(`/salary-structures/${structureId}/rules`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    update: async (
      id: string,
      data: {
        name?: string;
        code?: string;
        category?: string;
        sequence?: number;
        computationMethod?: 'FIXED' | 'PERCENTAGE';
        fixedAmount?: number | null;
        percentage?: number | null;
        baseRuleId?: string | null;
      }
    ) =>
      this.request<any>(`/salary-rules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),

    delete: async (id: string) =>
      this.request<any>(`/salary-rules/${id}`, {
        method: 'DELETE',
      }),
  };

  // ==========================================
  // PAYRUNS MODULE
  // ==========================================
  payruns = {
    getAll: async (params?: { status?: string; search?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.append('status', params.status);
      if (params?.search) q.append('search', params.search);
      const query = q.toString();
      return this.request<any[]>(`/payruns${query ? `?${query}` : ''}`);
    },

    getById: async (id: string) => this.request<any>(`/payruns/${id}`),

    previewEligible: async (data: {
      salaryStructureId: string;
      periodStart: string;
      periodEnd: string;
    }) =>
      this.request<any>('/payruns/preview-eligible', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    create: async (data: {
      name: string;
      salaryStructureId: string;
      periodStart: string;
      periodEnd: string;
      employeeIds: string[];
    }) =>
      this.request<any>('/payruns', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    compute: async (id: string) =>
      this.request<any>(`/payruns/${id}/compute`, {
        method: 'POST',
      }),

    validate: async (id: string) =>
      this.request<any>(`/payruns/${id}/validate`, {
        method: 'POST',
      }),

    markPaid: async (id: string) =>
      this.request<any>(`/payruns/${id}/mark-paid`, {
        method: 'POST',
      }),

    sendPayslipStatements: async (id: string) =>
      this.request<any>(`/payruns/${id}/send-payslips`, {
        method: 'POST',
      }),

    delete: async (id: string) =>
      this.request<any>(`/payruns/${id}`, {
        method: 'DELETE',
      }),
  };

  // ==========================================
  // PAYSLIPS MODULE
  // ==========================================
  payslips = {
    getAll: async (params?: { payrunId?: string; employeeId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.payrunId) q.append('payrunId', params.payrunId);
      if (params?.employeeId) q.append('employeeId', params.employeeId);
      if (params?.status) q.append('status', params.status);
      const query = q.toString();
      return this.request<any[]>(`/payslips${query ? `?${query}` : ''}`);
    },

    getById: async (id: string) => this.request<any>(`/payslips/${id}`),
  };

  // ==========================================
  // DASHBOARD MODULE
  // ==========================================
  dashboard = {
    get: async (params?: { period?: string; departmentId?: string; employeeType?: string }) => {
      const q = new URLSearchParams();
      if (params?.period) q.append('period', params.period);
      if (params?.departmentId) q.append('departmentId', params.departmentId);
      if (params?.employeeType) q.append('employeeType', params.employeeType);
      const query = q.toString();
      return this.request<any>(`/dashboard${query ? `?${query}` : ''}`);
    },
  };

  // ==========================================
  // TIME OFF & ALLOCATION MODULE
  // ==========================================
  timeOff = {
    // Types
    getTypes: async () => {
      return this.request<any[]>('/time-off-types');
    },
    getTypeById: async (id: string) => {
      return this.request<any>(`/time-off-types/${id}`);
    },
    createType: async (data: {
      name: string;
      unit?: 'DAYS' | 'HOURS';
      requiresAllocation?: boolean;
      requiresApproval?: boolean;
      affectsPayroll?: boolean;
    }) => {
      return this.request<any>('/time-off-types', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    updateType: async (id: string, data: any) => {
      return this.request<any>(`/time-off-types/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    archiveType: async (id: string) => {
      return this.request<any>(`/time-off-types/${id}`, {
        method: 'DELETE',
      });
    },

    // Allocations
    getAllocations: async (params?: { employeeId?: string; timeOffTypeId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.employeeId) q.append('employeeId', params.employeeId);
      if (params?.timeOffTypeId) q.append('timeOffTypeId', params.timeOffTypeId);
      if (params?.status) q.append('status', params.status);
      const query = q.toString();
      return this.request<any[]>(`/time-off-allocations${query ? `?${query}` : ''}`);
    },
    getAllocationById: async (id: string) => {
      return this.request<any>(`/time-off-allocations/${id}`);
    },
    createAllocation: async (data: {
      employeeId: string;
      timeOffTypeId: string;
      allocated: number;
      validFrom: string;
      validTo?: string | null;
    }) => {
      return this.request<any>('/time-off-allocations', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    approveAllocation: async (id: string) => {
      return this.request<any>(`/time-off-allocations/${id}/approve`, {
        method: 'PATCH',
      });
    },
    refuseAllocation: async (id: string) => {
      return this.request<any>(`/time-off-allocations/${id}/refuse`, {
        method: 'PATCH',
      });
    },
    deleteAllocation: async (id: string) => {
      return this.request<any>(`/time-off-allocations/${id}`, {
        method: 'DELETE',
      });
    },

    // Requests
    getRequests: async (params?: { employeeId?: string; timeOffTypeId?: string; status?: string }) => {
      const q = new URLSearchParams();
      if (params?.employeeId) q.append('employeeId', params.employeeId);
      if (params?.timeOffTypeId) q.append('timeOffTypeId', params.timeOffTypeId);
      if (params?.status) q.append('status', params.status);
      const query = q.toString();
      return this.request<any[]>(`/time-off-requests${query ? `?${query}` : ''}`);
    },
    getRequestById: async (id: string) => {
      return this.request<any>(`/time-off-requests/${id}`);
    },
    createRequest: async (data: {
      employeeId?: string;
      timeOffTypeId: string;
      startDate: string;
      endDate: string;
      duration: number;
      reason?: string | null;
    }) => {
      return this.request<any>('/time-off-requests', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    approveRequest: async (id: string) => {
      return this.request<any>(`/time-off-requests/${id}/approve`, {
        method: 'PATCH',
      });
    },
    refuseRequest: async (id: string, data?: { decisionNote?: string | null }) => {
      return this.request<any>(`/time-off-requests/${id}/refuse`, {
        method: 'PATCH',
        body: JSON.stringify(data || {}),
      });
    },
    deleteRequest: async (id: string) => {
      return this.request<any>(`/time-off-requests/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

export const api = new ApiClient();

