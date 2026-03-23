import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, CheckCircle2, AlertCircle, FileText, User, Mail, Phone, MapPin, Briefcase, Award, Users, Info, Plus, Trash2, Eye, X, AlertTriangle } from 'lucide-react';
import { improveCV, analyzeDocument, isKeyInvalid } from '../services/geminiService';
import { CVData, Language } from '../types';
import { jsPDF } from 'jspdf';
import { toJpeg, toCanvas } from 'html-to-image';
import { generateSmartPdf } from '../utils/pdfUtils';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { convertOklchToRgb, resolveOklchInString } from '../utils/colorConverter';
import { extractTextFromPDF, extractTextFromWord, fileToBase64 } from '../utils/fileParser';
import { optimizeImage } from '../utils/imageOptimizer';
import { Upload, FileUp, Save } from 'lucide-react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export default function CVBuilder() {
  const location = useLocation();
  const [jobType, setJobType] = useState('');
  const [language, setLanguage] = useState<Language>('English');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [cvData, setCvData] = useState<CVData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const cvRef = useRef<HTMLDivElement>(null);

  // ... existing form data state ...

  const handleSaveToDashboard = async () => {
    if (!cvData || !auth.currentUser) return;
    
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      await addDoc(collection(db, 'documents'), {
        userId: auth.currentUser.uid,
        type: 'cv',
        title: `${cvData.fullName} - ${jobType || 'CV'}`,
        data: cvData,
        createdAt: serverTimestamp()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving document:", err);
      setError("Failed to save document to dashboard.");
    } finally {
      setIsSaving(false);
    }
  };

  // Structured Form State
  const [formData, setFormData] = useState({
    personalDetails: { fullName: '', email: '', phone: '', location: '', profilePicture: '' },
    careerObjective: '',
    education: [{ school: '', degree: '', year: '' }],
    experience: [{ company: '', role: '', period: '', description: '' }],
    skills: '',
    certifications: '',
    referees: [{ name: '', position: '', organization: '', contact: '' }]
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) return;
      try {
        const docRef = doc(db, 'profiles', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const profile = docSnap.data();
          setFormData(prev => ({
            ...prev,
            personalDetails: {
              ...prev.personalDetails,
              fullName: profile.fullName || '',
              email: profile.email || '',
              phone: profile.phone || '',
              location: profile.location || '',
            }
          }));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();

    // Load saved CV data if available (from Dashboard "Open" button via navigation state)
    const loadedData = location.state?.loadedData;
    const savedCV = loadedData ? JSON.stringify(loadedData) : localStorage.getItem('pakuacv_data');
    
    console.log("Checking for CV data...", loadedData ? "Found in state" : (savedCV ? "Found in localStorage" : "Not found"));
    
    if (loadedData || savedCV) {
      try {
        const parsed = loadedData || JSON.parse(savedCV!);
        console.log("Parsed CV data:", parsed);
        // Check if it's a full CV result (has summary or experience)
        if (parsed.summary || (parsed.experience && parsed.experience.length > 0)) {
          console.log("Loading CV data into state");
          setCvData(parsed);
          setFormData({
            personalDetails: {
              fullName: parsed.fullName || '',
              email: parsed.email || '',
              phone: parsed.phone || '',
              location: parsed.location || '',
              profilePicture: parsed.profilePicture || ''
            },
            careerObjective: parsed.summary || '',
            education: parsed.education || [],
            experience: parsed.experience || [],
            skills: Array.isArray(parsed.skills) ? parsed.skills.join(', ') : '',
            certifications: Array.isArray(parsed.certifications) ? parsed.certifications.join(', ') : '',
            referees: parsed.referees || []
          });
          if (parsed.jobType) setJobType(parsed.jobType);
          setActiveTab('preview');
        }
      } catch (e) {
        console.error("Failed to load CV data", e);
      }
    }
  }, [location.state]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          personalDetails: { ...prev.personalDetails, profilePicture: reader.result as string }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, profilePicture: '' }
    }));
  };

  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [name]: value }
    }));
  };

  const handleListChange = (section: 'education' | 'experience' | 'referees', index: number, field: string, value: string) => {
    setFormData(prev => {
      const newList = [...prev[section]];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [section]: newList };
    });
  };

  const addListItem = (section: 'education' | 'experience' | 'referees') => {
    const templates = {
      education: { school: '', degree: '', year: '' },
      experience: { company: '', role: '', period: '', description: '' },
      referees: { name: '', position: '', organization: '', contact: '' }
    };
    setFormData(prev => ({
      ...prev,
      [section]: [...prev[section], templates[section]]
    }));
  };

  const removeListItem = (section: 'education' | 'experience' | 'referees', index: number) => {
    setFormData(prev => ({
      ...prev,
      [section]: prev[section].filter((_, i) => i !== index)
    }));
  };

  const handleGenerate = async () => {
    if (!jobType.trim()) {
      setError('Please provide a target job type.');
      return;
    }

    // Convert structured data to a string for the AI to process
    const rawInfoString = `
      PERSONAL DETAILS:
      Name: ${formData.personalDetails.fullName}
      Email: ${formData.personalDetails.email}
      Phone: ${formData.personalDetails.phone}
      Location: ${formData.personalDetails.location}

      CAREER OBJECTIVE:
      ${formData.careerObjective}

      EDUCATION:
      ${formData.education.map(edu => `${edu.degree} from ${edu.school} (${edu.year})`).join('\n')}

      WORK EXPERIENCE:
      ${formData.experience.map(exp => `${exp.role} at ${exp.company} (${exp.period}): ${exp.description}`).join('\n')}

      SKILLS:
      ${formData.skills}

      CERTIFICATIONS:
      ${formData.certifications}

      REFEREES:
      ${formData.referees.map(ref => `${ref.name}, ${ref.position} at ${ref.organization}. Contact: ${ref.contact}`).join('\n')}
    `;
    
    setIsGenerating(true);
    setError(null);
    try {
      const result = await improveCV(rawInfoString, jobType, language);
      const finalData = { 
        ...result, 
        jobType,
        profilePicture: formData.personalDetails.profilePicture 
      };
      setCvData(finalData);
      setIsEditingResult(false);
      localStorage.setItem('pakuacv_data', JSON.stringify(finalData));
      
      // Update form data with AI-improved content so user can self-edit
      setFormData({
        personalDetails: {
          fullName: result.fullName,
          email: result.email,
          phone: result.phone,
          location: result.location,
          profilePicture: formData.personalDetails.profilePicture
        },
        careerObjective: result.summary,
        education: result.education,
        experience: result.experience,
        skills: result.skills.join(', '),
        certifications: result.certifications.join(', '),
        referees: result.referees
      });
    } catch (err) {
      setError('Failed to generate CV. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResultChange = (field: keyof CVData, value: any) => {
    if (!cvData) return;
    setCvData({ ...cvData, [field]: value });
  };

  const handleNestedResultChange = (section: 'experience' | 'education' | 'referees', index: number, field: string, value: string) => {
    if (!cvData) return;
    const newList = [...cvData[section]];
    newList[index] = { ...newList[index], [field]: value };
    setCvData({ ...cvData, [section]: newList });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview URL
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setIsAnalyzing(true);
    setError(null);
    try {
      let extractedData: any;
      const mimeType = file.type;
      const fileName = file.name.toLowerCase();

      if (mimeType.startsWith('image/')) {
        const optimizedBase64 = await optimizeImage(file);
        extractedData = await analyzeDocument(optimizedBase64, 'image/jpeg', 'cv');
      } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // Direct PDF processing is often faster and more accurate with Gemini
        const base64 = await fileToBase64(file);
        extractedData = await analyzeDocument(base64, 'application/pdf', 'cv');
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        mimeType === 'application/msword' ||
        fileName.endsWith('.docx') || 
        fileName.endsWith('.doc')
      ) {
        const text = await extractTextFromWord(file);
        extractedData = await analyzeDocument(text, 'text/plain', 'cv');
      } else {
        throw new Error('Unsupported file format. Please upload an Image, PDF, or Word document.');
      }

      if (extractedData) {
        setFormData(prev => ({
          ...prev,
          personalDetails: {
            ...prev.personalDetails,
            fullName: extractedData.fullName || prev.personalDetails.fullName,
            email: extractedData.email || prev.personalDetails.email,
            phone: extractedData.phone || prev.personalDetails.phone,
            location: extractedData.location || prev.personalDetails.location,
          },
          careerObjective: extractedData.summary || prev.careerObjective,
          education: extractedData.education?.length ? extractedData.education : prev.education,
          experience: extractedData.experience?.length ? extractedData.experience : prev.experience,
          skills: Array.isArray(extractedData.skills) ? extractedData.skills.join(', ') : (extractedData.skills || prev.skills),
          certifications: Array.isArray(extractedData.certifications) ? extractedData.certifications.join(', ') : (extractedData.certifications || prev.certifications),
          referees: extractedData.referees?.length ? extractedData.referees : prev.referees,
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadPDF = async () => {
    if (!cvRef.current) {
      setError('Could not find CV content to download.');
      return;
    }
    
    setIsDownloading(true);
    setError(null);
    
    try {
      // Ensure we are at the top of the page for better capture
      window.scrollTo(0, 0);
      
      // Small delay to ensure any layout shifts or animations are settled
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = cvRef.current;
      if (!element) return;

      // Use html-to-image to get a high-quality canvas
      const canvas = await toCanvas(element, { 
        backgroundColor: '#fff',
        pixelRatio: 2
      });

      const filename = `${(cvData?.fullName || 'My').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_CV.pdf`;
      await generateSmartPdf(canvas, filename);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setError(`Failed to generate PDF: ${err.message || 'Please try again.'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [selectedTemplate, setSelectedTemplate] = useState<'classic' | 'modern' | 'minimal'>('classic');

  const templates = [
    { id: 'classic', name: 'Classic' },
    { id: 'modern', name: 'Modern' },
    { id: 'minimal', name: 'Minimal' },
  ] as const;

  return (
    <div className="py-6 md:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Mobile Tabs */}
      <div className="flex lg:hidden mb-8 bg-zinc-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('edit')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'edit' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          Edit Details
        </button>
        <button
          onClick={() => setActiveTab('preview')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'preview' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          Preview CV
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Input Section */}
        <div className={`${activeTab === 'edit' ? 'block' : 'hidden lg:block'} space-y-8`}>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">CV Builder</h1>
            <p className="text-zinc-500 text-sm md:text-base">
              Fill in your details below to generate a professional Tanzanian-format CV.
            </p>
          </div>

          <div className="space-y-8">
            {/* Upload Existing CV */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <FileUp size={18} className="text-zinc-400" />
                  Upload Existing CV (Optional)
                </label>
                {isAnalyzing && <RefreshCw size={16} className="animate-spin text-zinc-400" />}
                {previewUrl && !isAnalyzing && (
                  <button
                    onClick={() => setIsPreviewOpen(true)}
                    className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors"
                  >
                    <Eye size={14} />
                    Preview Uploaded
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileUpload}
                  accept=".pdf,.doc,.docx,image/*"
                  className="hidden"
                  id="cv-upload"
                  disabled={isAnalyzing}
                />
                <label
                  htmlFor="cv-upload"
                  className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    isAnalyzing 
                      ? 'bg-zinc-50 border-zinc-200 cursor-not-allowed' 
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100'
                  }`}
                >
                  <Upload size={32} className={`mb-2 ${isAnalyzing ? 'text-emerald-500 animate-pulse' : 'text-zinc-300'}`} />
                  <p className="text-sm font-bold text-zinc-600">
                    {isAnalyzing ? 'AI is analyzing your CV...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isAnalyzing ? 'This usually takes 5-10 seconds' : 'PDF, Word, or Image (JPG, PNG)'}
                  </p>
                </label>
              </div>
              <p className="text-xs text-zinc-400 italic">The AI will extract your details and fill the form for you.</p>
            </div>

            {/* Language Selection */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Sparkles size={18} className="text-zinc-400" />
                Select Output Language
              </label>
              <div className="flex gap-4">
                {(['English', 'Kiswahili'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`flex-1 py-3 rounded-xl font-bold border transition-all ${
                      language === lang
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-400 italic">The AI will generate your CV in the selected language.</p>
            </div>

            {/* Job Type Input */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                <Briefcase size={18} className="text-zinc-400" />
                Target Job Type
              </label>
              <input
                type="text"
                value={jobType}
                onChange={(e) => setJobType(e.target.value)}
                placeholder="e.g. Software Engineer, Accountant, Project Manager"
                className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all"
              />
              <p className="text-xs text-zinc-400 italic">The AI will tailor your CV specifically for this role.</p>
            </div>

            {/* 1. Personal Details */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User size={20} className="text-zinc-400" />
                1. Personal Details
              </h3>
              
              {/* Profile Picture Upload */}
              <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-zinc-100">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-zinc-100 border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden transition-all group-hover:border-zinc-400">
                    {formData.personalDetails.profilePicture ? (
                      <img 
                        src={formData.personalDetails.profilePicture} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User size={32} className="text-zinc-300" />
                    )}
                  </div>
                  {formData.personalDetails.profilePicture && (
                    <button 
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-sm font-bold text-zinc-700 mb-1">Profile Picture (Optional)</p>
                  <p className="text-xs text-zinc-400 mb-3">Upload a professional headshot for your CV.</p>
                  <label className="inline-flex items-center px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-zinc-800 transition-colors">
                    <Plus size={14} className="mr-2" />
                    {formData.personalDetails.profilePicture ? 'Change Photo' : 'Upload Photo'}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="fullName"
                  value={formData.personalDetails.fullName}
                  onChange={handlePersonalChange}
                  placeholder="Full Name"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <input
                  type="email"
                  name="email"
                  value={formData.personalDetails.email}
                  onChange={handlePersonalChange}
                  placeholder="Email Address"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <input
                  type="text"
                  name="phone"
                  value={formData.personalDetails.phone}
                  onChange={handlePersonalChange}
                  placeholder="Phone Number"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <input
                  type="text"
                  name="location"
                  value={formData.personalDetails.location}
                  onChange={handlePersonalChange}
                  placeholder="Location (e.g. Dar es Salaam, Tanzania)"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* 2. Career Objective */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles size={20} className="text-zinc-400" />
                2. Career Objective
              </h3>
              <textarea
                value={formData.careerObjective}
                onChange={(e) => setFormData(prev => ({ ...prev, careerObjective: e.target.value }))}
                placeholder="Briefly describe your career goals and what you bring to the table..."
                className="w-full h-32 p-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
            </div>

            {/* 3. Education */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Info size={20} className="text-zinc-400" />
                  3. Education
                </h3>
                <button onClick={() => addListItem('education')} className="text-zinc-900 hover:text-zinc-600 flex items-center gap-1 text-sm font-bold">
                  <Plus size={16} /> Add
                </button>
              </div>
              {formData.education.map((edu, i) => (
                <div key={i} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 relative space-y-3">
                  {formData.education.length > 1 && (
                    <button onClick={() => removeListItem('education', i)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <input
                    type="text"
                    placeholder="School/University Name"
                    value={edu.school}
                    onChange={(e) => handleListChange('education', i, 'school', e.target.value)}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Degree/Certificate"
                      value={edu.degree}
                      onChange={(e) => handleListChange('education', i, 'degree', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Year (e.g. 2020 - 2024)"
                      value={edu.year}
                      onChange={(e) => handleListChange('education', i, 'year', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* 4. Work Experience */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Briefcase size={20} className="text-zinc-400" />
                  4. Work Experience
                </h3>
                <button onClick={() => addListItem('experience')} className="text-zinc-900 hover:text-zinc-600 flex items-center gap-1 text-sm font-bold">
                  <Plus size={16} /> Add
                </button>
              </div>
              {formData.experience.map((exp, i) => (
                <div key={i} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 relative space-y-3">
                  {formData.experience.length > 1 && (
                    <button onClick={() => removeListItem('experience', i)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Company Name"
                      value={exp.company}
                      onChange={(e) => handleListChange('experience', i, 'company', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Your Role"
                      value={exp.role}
                      onChange={(e) => handleListChange('experience', i, 'role', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Period (e.g. Jan 2022 - Present)"
                    value={exp.period}
                    onChange={(e) => handleListChange('experience', i, 'period', e.target.value)}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                  />
                  <textarea
                    placeholder="Briefly describe your achievements and responsibilities..."
                    value={exp.description}
                    onChange={(e) => handleListChange('experience', i, 'description', e.target.value)}
                    className="w-full h-24 p-2 bg-white border border-zinc-200 rounded-lg outline-none resize-none"
                  />
                </div>
              ))}
            </div>

            {/* 5. Skills */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CheckCircle2 size={20} className="text-zinc-400" />
                5. Skills
              </h3>
              <textarea
                value={formData.skills}
                onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                placeholder="List your skills separated by commas (e.g. Microsoft Office, Team Leadership, Python...)"
                className="w-full h-24 p-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
            </div>

            {/* 6. Certifications */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Award size={20} className="text-zinc-400" />
                6. Certifications
              </h3>
              <textarea
                value={formData.certifications}
                onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
                placeholder="List your professional certifications or awards..."
                className="w-full h-24 p-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
            </div>

            {/* 7. Referees */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Users size={20} className="text-zinc-400" />
                  7. Referees
                </h3>
                <button onClick={() => addListItem('referees')} className="text-zinc-900 hover:text-zinc-600 flex items-center gap-1 text-sm font-bold">
                  <Plus size={16} /> Add
                </button>
              </div>
              {formData.referees.map((ref, i) => (
                <div key={i} className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 relative space-y-3">
                  {formData.referees.length > 1 && (
                    <button onClick={() => removeListItem('referees', i)} className="absolute top-2 right-2 text-zinc-400 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Referee Name"
                      value={ref.name}
                      onChange={(e) => handleListChange('referees', i, 'name', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Position"
                      value={ref.position}
                      onChange={(e) => handleListChange('referees', i, 'position', e.target.value)}
                      className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Organization"
                    value={ref.organization}
                    onChange={(e) => handleListChange('referees', i, 'organization', e.target.value)}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Contact Info (Phone/Email)"
                    value={ref.contact}
                    onChange={(e) => handleListChange('referees', i, 'contact', e.target.value)}
                    className="w-full p-2 bg-white border border-zinc-200 rounded-lg outline-none"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !jobType.trim() || isKeyInvalid}
              className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                isGenerating || !jobType.trim() || isKeyInvalid
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-200'
              }`}
            >
              {isKeyInvalid ? (
                <>
                  <AlertTriangle size={24} className="text-amber-500" />
                  AI Features Disabled (Missing API Key)
                </>
              ) : isGenerating ? (
                <>
                  <RefreshCw size={24} className="animate-spin" />
                  Tailoring your CV...
                </>
              ) : (
                <>
                  <Sparkles size={24} className="text-amber-400" />
                  Generate Tanzanian Format CV
                </>
              )}
            </button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        <div className={`${activeTab === 'preview' ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Preview</h2>
              <div className="flex bg-zinc-100 p-1 rounded-lg">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                      selectedTemplate === t.id 
                        ? 'bg-white text-zinc-900 shadow-sm' 
                        : 'text-zinc-500 hover:text-zinc-700'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {cvData && (
                <button
                  onClick={() => setIsEditingResult(!isEditingResult)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    isEditingResult 
                      ? 'bg-zinc-900 text-white shadow-sm' 
                      : 'bg-zinc-100 text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {isEditingResult ? 'Finish Editing' : 'Edit Result'}
                </button>
              )}
            </div>
            {cvData && (
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSaveToDashboard}
                  disabled={isSaving}
                  className={`flex items-center gap-2 text-sm font-bold transition-all ${
                    saveSuccess ? 'text-emerald-600' : 'text-zinc-900 hover:text-zinc-600'
                  }`}
                >
                  {isSaving ? <RefreshCw size={18} className="animate-spin" /> : saveSuccess ? <CheckCircle2 size={18} /> : <Save size={18} />}
                  {saveSuccess ? 'Saved!' : 'Save to Dashboard'}
                </button>
                <button
                  onClick={downloadPDF}
                  disabled={isDownloading}
                  className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                    isDownloading ? 'text-zinc-400' : 'text-zinc-900 hover:text-zinc-600'
                  }`}
                >
                  {isDownloading ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                  {isDownloading ? 'Generating PDF...' : 'Download PDF'}
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {!cvData && !isGenerating ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="aspect-[1/1.414] bg-zinc-100 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 p-12 text-center"
                >
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Your structured CV will appear here after generation.</p>
                </motion.div>
              ) : isGenerating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="aspect-[1/1.414] bg-white rounded-2xl border border-zinc-200 p-12 space-y-8 animate-pulse"
                >
                  <div className="h-8 bg-zinc-100 rounded w-1/3" />
                  <div className="space-y-2">
                    <div className="h-4 bg-zinc-100 rounded w-full" />
                    <div className="h-4 bg-zinc-100 rounded w-5/6" />
                  </div>
                  <div className="pt-8 space-y-4">
                    <div className="h-6 bg-zinc-100 rounded w-1/4" />
                    <div className="h-20 bg-zinc-100 rounded w-full" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="cv"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden"
                >
                  <div 
                    id="cv-preview-content"
                    ref={cvRef}
                    className={`p-6 md:p-12 aspect-[1/1.414] bg-white text-zinc-900 font-sans ${
                      selectedTemplate === 'minimal' ? 'bg-zinc-50' : ''
                    }`}
                    style={{ fontSize: '12px' }}
                  >
                    {/* CV Header */}
                    {selectedTemplate === 'classic' && (
                      <header className="border-b-2 border-zinc-900 pb-4 md:pb-8 mb-6 md:mb-8 text-center">
                        {cvData?.profilePicture && (
                          <div className="mb-4 flex justify-center">
                            <img 
                              src={cvData.profilePicture} 
                              alt="Profile" 
                              className="w-24 h-24 rounded-full object-cover border-2 border-zinc-900 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2 md:mb-4 uppercase">{cvData?.fullName}</h1>
                        <div className="flex flex-wrap justify-center gap-2 md:gap-4 text-zinc-600 text-[10px] md:text-xs">
                          <span className="flex items-center gap-1"><Mail size={10} /> {cvData?.email}</span>
                          <span className="flex items-center gap-1"><Phone size={10} /> {cvData?.phone}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} /> {cvData?.location}</span>
                        </div>
                      </header>
                    )}

                    {selectedTemplate === 'modern' && (
                      <header className="flex flex-col md:flex-row md:items-center justify-between border-l-4 border-zinc-900 pl-6 pb-4 md:pb-8 mb-6 md:mb-8 gap-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                          {cvData?.profilePicture && (
                            <img 
                              src={cvData.profilePicture} 
                              alt="Profile" 
                              className="w-24 h-24 rounded-2xl object-cover border-2 border-zinc-100 shadow-sm"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div>
                            <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none mb-2">{cvData?.fullName}</h1>
                            <p className="text-zinc-500 font-medium uppercase tracking-widest text-[10px]">{cvData?.jobType}</p>
                          </div>
                        </div>
                        <div className="text-right text-zinc-600 text-[10px] md:text-xs space-y-1">
                          <p className="flex items-center justify-end gap-1">{cvData?.email} <Mail size={10} /></p>
                          <p className="flex items-center justify-end gap-1">{cvData?.phone} <Phone size={10} /></p>
                          <p className="flex items-center justify-end gap-1">{cvData?.location} <MapPin size={10} /></p>
                        </div>
                      </header>
                    )}

                    {selectedTemplate === 'minimal' && (
                      <header className="mb-12 text-center">
                        {cvData?.profilePicture && (
                          <div className="mb-6 flex justify-center">
                            <img 
                              src={cvData.profilePicture} 
                              alt="Profile" 
                              className="w-20 h-20 rounded-full object-cover grayscale opacity-80"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        <h1 className="text-3xl md:text-4xl font-light tracking-widest uppercase mb-4">{cvData?.fullName}</h1>
                        <div className="flex flex-wrap justify-center gap-6 text-zinc-400 text-[10px] uppercase tracking-widest">
                          <span>{cvData?.email}</span>
                          <span>{cvData?.phone}</span>
                          <span>{cvData?.location}</span>
                        </div>
                      </header>
                    )}

                    <div className="space-y-6 md:space-y-8">
                      {/* Career Objective */}
                      <section className="pdf-section">
                        <h2 className={`text-sm font-bold uppercase tracking-widest mb-3 ${
                          selectedTemplate === 'classic' ? 'border-b border-zinc-200 pb-1' : 
                          selectedTemplate === 'modern' ? 'text-zinc-900 bg-zinc-100 px-2 py-1 inline-block mb-4' :
                          'text-zinc-400 mb-2'
                        }`}>Career Objective</h2>
                        {isEditingResult ? (
                          <textarea 
                            className="w-full h-32 p-2 border border-zinc-200 outline-none resize-none text-zinc-700"
                            value={cvData?.summary}
                            onChange={(e) => handleResultChange('summary', e.target.value)}
                          />
                        ) : (
                          <p className="text-zinc-700 leading-relaxed text-justify">
                            {cvData?.summary}
                          </p>
                        )}
                      </section>

                      {/* Education */}
                      <section className="pdf-section">
                        <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${
                          selectedTemplate === 'classic' ? 'border-b border-zinc-200 pb-1' : 
                          selectedTemplate === 'modern' ? 'text-zinc-900 bg-zinc-100 px-2 py-1 inline-block mb-4' :
                          'text-zinc-400 mb-2'
                        }`}>Education Background</h2>
                        <div className="space-y-4">
                          {cvData?.education.map((edu, i) => (
                            <div key={i} className={selectedTemplate === 'modern' ? 'border-l-2 border-zinc-100 pl-4' : ''}>
                              {isEditingResult ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between gap-2">
                                    <input 
                                      className="font-bold text-zinc-900 flex-1 border-b border-zinc-200 outline-none"
                                      value={edu.degree}
                                      onChange={(e) => handleNestedResultChange('education', i, 'degree', e.target.value)}
                                    />
                                    <input 
                                      className="text-zinc-500 font-medium w-24 border-b border-zinc-200 outline-none"
                                      value={edu.year}
                                      onChange={(e) => handleNestedResultChange('education', i, 'year', e.target.value)}
                                    />
                                  </div>
                                  <input 
                                    className="text-zinc-700 italic w-full border-b border-zinc-200 outline-none"
                                    value={edu.school}
                                    onChange={(e) => handleNestedResultChange('education', i, 'school', e.target.value)}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="font-bold text-zinc-900">{edu.degree}</p>
                                    <p className="text-zinc-500 font-medium">{edu.year}</p>
                                  </div>
                                  <p className="text-zinc-700 italic">{edu.school}</p>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Work Experience */}
                      <section className="pdf-section">
                        <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${
                          selectedTemplate === 'classic' ? 'border-b border-zinc-200 pb-1' : 
                          selectedTemplate === 'modern' ? 'text-zinc-900 bg-zinc-100 px-2 py-1 inline-block mb-4' :
                          'text-zinc-400 mb-2'
                        }`}>Work Experience</h2>
                        <div className="space-y-6">
                          {cvData?.experience.map((exp, i) => (
                            <div key={i} className={selectedTemplate === 'modern' ? 'border-l-2 border-zinc-100 pl-4' : ''}>
                              {isEditingResult ? (
                                <div className="space-y-2">
                                  <div className="flex justify-between gap-2">
                                    <input 
                                      className="font-bold text-zinc-900 flex-1 border-b border-zinc-200 outline-none"
                                      value={exp.role}
                                      onChange={(e) => handleNestedResultChange('experience', i, 'role', e.target.value)}
                                    />
                                    <input 
                                      className="text-zinc-500 font-medium w-32 border-b border-zinc-200 outline-none"
                                      value={exp.period}
                                      onChange={(e) => handleNestedResultChange('experience', i, 'period', e.target.value)}
                                    />
                                  </div>
                                  <input 
                                    className="text-zinc-700 font-medium w-full border-b border-zinc-200 outline-none"
                                    value={exp.company}
                                    onChange={(e) => handleNestedResultChange('experience', i, 'company', e.target.value)}
                                  />
                                  <textarea 
                                    className="w-full h-24 p-2 border border-zinc-200 outline-none resize-none text-zinc-700"
                                    value={exp.description}
                                    onChange={(e) => handleNestedResultChange('experience', i, 'description', e.target.value)}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="font-bold text-zinc-900">{exp.role}</p>
                                    <p className="text-zinc-500 font-medium">{exp.period}</p>
                                  </div>
                                  <p className="text-zinc-700 font-medium mb-2">{exp.company}</p>
                                  <p className="text-zinc-700 leading-relaxed whitespace-pre-line text-justify">{exp.description}</p>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Skills */}
                      <section className="pdf-section">
                        <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${
                          selectedTemplate === 'classic' ? 'border-b border-zinc-200 pb-1' : 
                          selectedTemplate === 'modern' ? 'text-zinc-900 bg-zinc-100 px-2 py-1 inline-block mb-4' :
                          'text-zinc-400 mb-2'
                        }`}>Key Skills & Competencies</h2>
                        {isEditingResult ? (
                          <textarea 
                            className="w-full h-24 p-2 border border-zinc-200 outline-none resize-none text-zinc-700"
                            value={cvData?.skills.join(', ')}
                            onChange={(e) => handleResultChange('skills', e.target.value.split(',').map(s => s.trim()))}
                          />
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {cvData?.skills.map((skill, i) => (
                              <span key={i} className={`px-2 py-1 text-[10px] font-medium ${
                                selectedTemplate === 'modern' ? 'bg-zinc-900 text-white rounded' :
                                selectedTemplate === 'minimal' ? 'text-zinc-600 border border-zinc-200' :
                                'bg-zinc-100 text-zinc-700'
                              }`}>
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>

                      {/* Certifications */}
                      {cvData?.certifications && cvData.certifications.length > 0 && (
                        <section className="pdf-section">
                          <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${
                            selectedTemplate === 'classic' ? 'border-b border-zinc-200 pb-1' : 
                            selectedTemplate === 'modern' ? 'text-zinc-900 bg-zinc-100 px-2 py-1 inline-block mb-4' :
                            'text-zinc-400 mb-2'
                          }`}>Certifications & Awards</h2>
                          {isEditingResult ? (
                            <textarea 
                              className="w-full h-24 p-2 border border-zinc-200 outline-none resize-none text-zinc-700"
                              value={cvData?.certifications.join(', ')}
                              onChange={(e) => handleResultChange('certifications', e.target.value.split(',').map(s => s.trim()))}
                            />
                          ) : (
                            <ul className={`list-disc list-inside text-zinc-700 space-y-1 ${selectedTemplate === 'minimal' ? 'list-none' : ''}`}>
                              {cvData.certifications.map((cert, i) => (
                                <li key={i}>{cert}</li>
                              ))}
                            </ul>
                          )}
                        </section>
                      )}

                      {/* Referees */}
                      {cvData?.referees && cvData.referees.length > 0 && (
                        <section className="pdf-section">
                          <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 ${
                            selectedTemplate === 'classic' ? 'border-b border-zinc-200 pb-1' : 
                            selectedTemplate === 'modern' ? 'text-zinc-900 bg-zinc-100 px-2 py-1 inline-block mb-4' :
                            'text-zinc-400 mb-2'
                          }`}>Referees</h2>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                            {cvData.referees.map((ref, i) => (
                              <div key={i} className={`text-zinc-700 ${selectedTemplate === 'modern' ? 'bg-zinc-50 p-3 rounded-lg border-l-2 border-zinc-200' : ''}`}>
                                {isEditingResult ? (
                                  <div className="space-y-1">
                                    <input 
                                      className="font-bold w-full border-b border-zinc-200 outline-none"
                                      value={ref.name}
                                      onChange={(e) => handleNestedResultChange('referees', i, 'name', e.target.value)}
                                    />
                                    <input 
                                      className="text-xs text-zinc-500 w-full border-b border-zinc-200 outline-none"
                                      value={ref.position}
                                      onChange={(e) => handleNestedResultChange('referees', i, 'position', e.target.value)}
                                    />
                                    <input 
                                      className="text-xs text-zinc-500 w-full border-b border-zinc-200 outline-none"
                                      value={ref.organization}
                                      onChange={(e) => handleNestedResultChange('referees', i, 'organization', e.target.value)}
                                    />
                                    <input 
                                      className="text-xs mt-1 font-mono w-full border-b border-zinc-200 outline-none"
                                      value={ref.contact}
                                      onChange={(e) => handleNestedResultChange('referees', i, 'contact', e.target.value)}
                                    />
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-bold">{ref.name}</p>
                                    <p className="text-xs text-zinc-500">{ref.position}</p>
                                    <p className="text-xs text-zinc-500">{ref.organization}</p>
                                    <p className="text-xs mt-1 font-mono">{ref.contact}</p>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      {/* Document Preview Modal */}
      <AnimatePresence>
        {isPreviewOpen && previewUrl && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-100 flex justify-between items-center bg-zinc-50">
                <h3 className="font-bold text-zinc-900 flex items-center gap-2">
                  <FileText size={18} className="text-emerald-500" />
                  Document Preview
                </h3>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 bg-zinc-100 overflow-auto p-4 flex justify-center">
                {previewUrl.startsWith('blob:') && (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full rounded-lg bg-white shadow-sm"
                    title="Document Preview"
                  />
                )}
              </div>
              <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-end">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-6 py-2 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


