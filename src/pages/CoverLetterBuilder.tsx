import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Download, RefreshCw, AlertCircle, FileText, User, Mail, Phone, MapPin, Building2, Briefcase, CheckCircle2, Eye, X } from 'lucide-react';
import { generateCoverLetter, analyzeDocument } from '../services/geminiService';
import { CoverLetterData, CVData, Language } from '../types';
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

export default function CoverLetterBuilder() {
  const location = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditingResult, setIsEditingResult] = useState(false);
  const [language, setLanguage] = useState<Language>('English');
  const [clData, setClData] = useState<CoverLetterData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cvBackground, setCvBackground] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const clRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    personalDetails: { fullName: '', email: '', phone: '', location: '' },
    jobDescription: '',
    companyDetails: { name: '', address: '', recipient: '' }
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
              fullName: profile.fullName || prev.personalDetails.fullName,
              email: profile.email || prev.personalDetails.email,
              phone: profile.phone || prev.personalDetails.phone,
              location: profile.location || prev.personalDetails.location,
            }
          }));
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };
    fetchProfile();

    // Check for saved Cover Letter data (from Dashboard "Open" via navigation state or localStorage)
    const loadedData = location.state?.loadedData;
    const savedCL = loadedData ? JSON.stringify(loadedData) : localStorage.getItem('pakuacl_data');
    
    console.log("Checking for Cover Letter data...", loadedData ? "Found in state" : (savedCL ? "Found in localStorage" : "Not found"));
    
    if (loadedData || savedCL) {
      try {
        const parsed = loadedData || JSON.parse(savedCL!);
        console.log("Parsed Cover Letter data:", parsed);
        if (parsed.content || parsed.subject) {
          console.log("Loading Cover Letter data into state");
          setClData(parsed);
          setFormData({
            personalDetails: {
              fullName: parsed.fullName || '',
              email: parsed.email || '',
              phone: parsed.phone || '',
              location: parsed.location || ''
            },
            jobDescription: '', // We don't necessarily have the original JD
            companyDetails: {
              name: parsed.companyName || '',
              address: parsed.companyAddress || '',
              recipient: parsed.recipientName || ''
            }
          });
          setActiveTab('preview');
        }
      } catch (e) {
        console.error("Failed to load Cover Letter data", e);
      }
    }

    // Also check for CV data to pre-fill if no CL data was loaded
    const savedCV = localStorage.getItem('pakuacv_data');
    if (savedCV && !savedCL) {
      try {
        const cv: CVData = JSON.parse(savedCV);
        setFormData(prev => ({
          ...prev,
          personalDetails: {
            fullName: cv.fullName || '',
            email: cv.email || '',
            phone: cv.phone || '',
            location: cv.location || ''
          }
        }));
        
        // Construct background string for AI
        const background = `
          Summary: ${cv.summary}
          Experience: ${cv.experience.map(e => `${e.role} at ${e.company} (${e.period}): ${e.description}`).join('; ')}
          Education: ${cv.education.map(e => `${e.degree} from ${e.school} (${e.year})`).join('; ')}
          Skills: ${cv.skills.join(', ')}
          Certifications: ${cv.certifications.join(', ')}
        `;
        setCvBackground(background);
      } catch (e) {
        console.error('Failed to parse saved CV data', e);
      }
    }
  }, [location.state]);

  const handleSaveToDashboard = async () => {
    if (!clData || !auth.currentUser) return;
    
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    
    try {
      await addDoc(collection(db, 'documents'), {
        userId: auth.currentUser.uid,
        type: 'cover_letter',
        title: `${clData.fullName} - Cover Letter (${formData.companyDetails.name || 'General'})`,
        data: clData,
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

  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [name]: value }
    }));
  };

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      companyDetails: { ...prev.companyDetails, [name]: value }
    }));
  };

  const handleGenerate = async () => {
    if (!formData.jobDescription.trim()) {
      setError('Please provide a job description.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const personalInfo = `Name: ${formData.personalDetails.fullName}, Email: ${formData.personalDetails.email}, Phone: ${formData.personalDetails.phone}, Location: ${formData.personalDetails.location}`;
      const companyInfo = `Company: ${formData.companyDetails.name}, Address: ${formData.companyDetails.address}, Recipient: ${formData.companyDetails.recipient}`;
      
      const result = await generateCoverLetter(personalInfo, formData.jobDescription, companyInfo, cvBackground, language);
      setClData(result);
      setIsEditingResult(false);
      setActiveTab('preview');
    } catch (err) {
      setError('Failed to generate cover letter. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleResultChange = (field: keyof CoverLetterData, value: string) => {
    if (!clData) return;
    setClData({ ...clData, [field]: value });
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
        extractedData = await analyzeDocument(optimizedBase64, 'image/jpeg', 'cover_letter');
      } else if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        // Direct PDF processing is often faster and more accurate with Gemini
        const base64 = await fileToBase64(file);
        extractedData = await analyzeDocument(base64, 'application/pdf', 'cover_letter');
      } else if (
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        mimeType === 'application/msword' ||
        fileName.endsWith('.docx') || 
        fileName.endsWith('.doc')
      ) {
        const text = await extractTextFromWord(file);
        extractedData = await analyzeDocument(text, 'text/plain', 'cover_letter');
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
          companyDetails: {
            ...prev.companyDetails,
            name: extractedData.companyName || prev.companyDetails.name,
            address: extractedData.companyAddress || prev.companyDetails.address,
            recipient: extractedData.recipientName || prev.companyDetails.recipient,
          },
          jobDescription: extractedData.content || prev.jobDescription,
        }));
        
        if (extractedData.content) {
          // If they uploaded a full letter, we can also set the clData directly for immediate preview
          setClData(extractedData);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze document.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadPDF = async () => {
    if (!clRef.current) {
      setError('Could not find Cover Letter content to download.');
      return;
    }
    
    setIsDownloading(true);
    setError(null);
    
    try {
      // Ensure we are at the top of the page for better capture
      window.scrollTo(0, 0);
      
      // Small delay to ensure any layout shifts or animations are settled
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = clRef.current;
      if (!element) return;
      
      // Use html-to-image to get a high-quality canvas
      const canvas = await toCanvas(element, { 
        backgroundColor: '#fff',
        pixelRatio: 2
      });

      const filename = `${(clData?.fullName || 'My').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_CoverLetter.pdf`;
      await generateSmartPdf(canvas, filename);
    } catch (err: any) {
      console.error('PDF Generation Error:', err);
      setError(`Failed to generate PDF: ${err.message || 'Please try again.'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');

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
          Preview CL
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
        
        {/* Input Section */}
        <div className={`${activeTab === 'edit' ? 'block' : 'hidden lg:block'} space-y-8`}>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-4">Cover Letter Maker</h1>
            <p className="text-zinc-500 text-sm md:text-base">
              Generate a tailored, professional cover letter in seconds using AI.
            </p>
          </div>

          <div className="space-y-8">
            {/* Upload Existing Cover Letter */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-zinc-700 flex items-center gap-2">
                  <FileUp size={18} className="text-zinc-400" />
                  Upload Existing Cover Letter (Optional)
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
                  id="cl-upload"
                  disabled={isAnalyzing}
                />
                <label
                  htmlFor="cl-upload"
                  className={`w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                    isAnalyzing 
                      ? 'bg-zinc-50 border-zinc-200 cursor-not-allowed' 
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 hover:bg-zinc-100'
                  }`}
                >
                  <Upload size={32} className={`mb-2 ${isAnalyzing ? 'text-emerald-500 animate-pulse' : 'text-zinc-300'}`} />
                  <p className="text-sm font-bold text-zinc-600">
                    {isAnalyzing ? 'AI is analyzing your document...' : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {isAnalyzing ? 'This usually takes 5-10 seconds' : 'PDF, Word, or Image (JPG, PNG)'}
                  </p>
                </label>
              </div>
              <p className="text-xs text-zinc-400 italic">The AI will extract details and fill the form for you.</p>
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
              <p className="text-xs text-zinc-400 italic">The AI will generate your cover letter in the selected language.</p>
            </div>

            {/* 1. Personal Details */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <User size={20} className="text-zinc-400" />
                1. Your Details
              </h3>
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
                  placeholder="Location (City, Country)"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* 2. Company Details */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Building2 size={20} className="text-zinc-400" />
                2. Company Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  value={formData.companyDetails.name}
                  onChange={handleCompanyChange}
                  placeholder="Company Name"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <input
                  type="text"
                  name="recipient"
                  value={formData.companyDetails.recipient}
                  onChange={handleCompanyChange}
                  placeholder="Hiring Manager Name (Optional)"
                  className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <div className="md:col-span-2">
                  <input
                    type="text"
                    name="address"
                    value={formData.companyDetails.address}
                    onChange={handleCompanyChange}
                    placeholder="Company Address"
                    className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </div>

            {/* 3. Job Description */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Briefcase size={20} className="text-zinc-400" />
                  3. Job Description
                </h3>
                {cvBackground && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    <CheckCircle2 size={12} />
                    CV Background Linked
                  </span>
                )}
              </div>
              <textarea
                value={formData.jobDescription}
                onChange={(e) => setFormData(prev => ({ ...prev, jobDescription: e.target.value }))}
                placeholder="Paste the job description for the role you are applying for..."
                className="w-full h-48 p-4 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:ring-2 focus:ring-zinc-900 resize-none"
              />
              <p className="text-xs text-zinc-400 italic">
                {cvBackground 
                  ? "The AI will use your CV background and this job description to tailor the letter."
                  : "Paste the job description or describe your relevant skills for this role."}
              </p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !formData.jobDescription.trim()}
              className={`w-full py-5 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all ${
                isGenerating || !formData.jobDescription.trim()
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                  : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl shadow-zinc-200'
              }`}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={24} className="animate-spin" />
                  Writing your letter...
                </>
              ) : (
                <>
                  <Sparkles size={24} className="text-amber-400" />
                  Generate AI Cover Letter
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
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Preview</h2>
              {clData && (
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
            {clData && (
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
              {!clData && !isGenerating ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="aspect-[1/1.414] bg-zinc-100 rounded-2xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-zinc-400 p-12 text-center"
                >
                  <FileText size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Your AI-generated cover letter will appear here.</p>
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
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="h-4 bg-zinc-100 rounded w-full" />
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="cl"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden"
                >
                  <div 
                    id="cl-preview-content"
                    ref={clRef}
                    className="p-12 aspect-[1/1.414] bg-white text-zinc-900 font-serif leading-relaxed"
                    style={{ fontSize: '13px' }}
                  >
                    {/* Header */}
                    <div className="mb-8 pdf-section">
                      {isEditingResult ? (
                        <div className="space-y-2">
                          <input 
                            className="font-bold text-lg w-full border-b border-zinc-200 outline-none"
                            value={clData?.fullName}
                            onChange={(e) => handleResultChange('fullName', e.target.value)}
                          />
                          <input 
                            className="text-zinc-600 w-full border-b border-zinc-200 outline-none"
                            value={clData?.location}
                            onChange={(e) => handleResultChange('location', e.target.value)}
                          />
                          <div className="flex gap-2">
                            <input 
                              className="text-zinc-600 flex-1 border-b border-zinc-200 outline-none"
                              value={clData?.email}
                              onChange={(e) => handleResultChange('email', e.target.value)}
                            />
                            <input 
                              className="text-zinc-600 flex-1 border-b border-zinc-200 outline-none"
                              value={clData?.phone}
                              onChange={(e) => handleResultChange('phone', e.target.value)}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-bold text-lg">{clData?.fullName}</p>
                          <p className="text-zinc-600">{clData?.location}</p>
                          <p className="text-zinc-600">{clData?.email} | {clData?.phone}</p>
                        </>
                      )}
                    </div>

                    <div className="mb-8 pdf-section">
                      {isEditingResult ? (
                        <input 
                          className="w-full border-b border-zinc-200 outline-none"
                          value={clData?.date}
                          onChange={(e) => handleResultChange('date', e.target.value)}
                        />
                      ) : (
                        <p>{clData?.date}</p>
                      )}
                    </div>

                    <div className="mb-8 pdf-section">
                      {isEditingResult ? (
                        <div className="space-y-2">
                          <input 
                            className="font-bold w-full border-b border-zinc-200 outline-none"
                            value={clData?.recipientName}
                            onChange={(e) => handleResultChange('recipientName', e.target.value)}
                          />
                          <input 
                            className="w-full border-b border-zinc-200 outline-none"
                            value={clData?.recipientTitle}
                            onChange={(e) => handleResultChange('recipientTitle', e.target.value)}
                          />
                          <input 
                            className="w-full border-b border-zinc-200 outline-none"
                            value={clData?.companyName}
                            onChange={(e) => handleResultChange('companyName', e.target.value)}
                          />
                          <input 
                            className="w-full border-b border-zinc-200 outline-none"
                            value={clData?.companyAddress}
                            onChange={(e) => handleResultChange('companyAddress', e.target.value)}
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-bold">{clData?.recipientName}</p>
                          <p>{clData?.recipientTitle}</p>
                          <p>{clData?.companyName}</p>
                          <p>{clData?.companyAddress}</p>
                        </>
                      )}
                    </div>

                    <div className="mb-6 pdf-section">
                      {isEditingResult ? (
                        <input 
                          className="font-bold underline w-full border-b border-zinc-200 outline-none"
                          value={clData?.subject}
                          onChange={(e) => handleResultChange('subject', e.target.value)}
                        />
                      ) : (
                        <p className="font-bold underline">RE: {clData?.subject}</p>
                      )}
                    </div>

                    <div className="whitespace-pre-line text-justify">
                      {isEditingResult ? (
                        <textarea 
                          className="w-full h-96 border border-zinc-200 p-2 outline-none resize-none"
                          value={clData?.content}
                          onChange={(e) => handleResultChange('content', e.target.value)}
                        />
                      ) : (
                        clData?.content
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
