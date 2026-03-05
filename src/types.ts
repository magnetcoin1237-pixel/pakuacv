export type Language = 'English' | 'Kiswahili';

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  author: string;
  category: string;
}

export interface CVData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  jobType?: string;
  profilePicture?: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  certifications: string[];
  referees: Referee[];
}

export interface Referee {
  name: string;
  position: string;
  organization: string;
  contact: string;
}

export interface Experience {
  company: string;
  role: string;
  period: string;
  description: string;
}

export interface Education {
  school: string;
  degree: string;
  year: string;
}

export interface CoverLetterData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  date: string;
  recipientName: string;
  recipientTitle: string;
  companyName: string;
  companyAddress: string;
  subject: string;
  content: string;
}
