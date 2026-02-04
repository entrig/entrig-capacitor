export interface User {
  id: string;
  name: string;
  created_at?: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at?: string;
}

export interface Message {
  id: string;
  content: string;
  user_id: string;
  group_id: string;
  created_at?: string;
  users?: Pick<User, 'name'>;
}

export interface GroupMember {
  user_id: string;
  group_id: string;
  created_at?: string;
}
