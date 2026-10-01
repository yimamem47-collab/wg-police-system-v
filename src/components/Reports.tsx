import React, { useState, useEffect } from 'react';
import { 
  FileText, Plus, Search, Trash2, Download, Edit2, Shield, Mic, Square, 
  ChevronLeft, ChevronRight, Send, CheckCircle, Info, X, Volume2, Camera, 
  File as FileIcon, FileCheck, Image as ImageIcon, Loader2, Calendar, Filter, 
  Check, FileDown, Layers, RotateCcw, UserCheck, SlidersHorizontal, Car
} from 'lucide-react';
import { Report, Officer, Incident, Assignment, User } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Language, translations } from '../lib/translations';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Capacitor } from '@capacitor/core';
import { exportIncidentAssignmentSummaryPDF, exportSingleReportPDF } from '../services/pdfExportService';

interface ReportsProps {
  reports: Report[];
  officers: Officer[];
  incidents?: Incident[];
  assignments?: Assignment[];
  user?: User | null;
  lang: Language;
  initialEditId?: string | null;
  onAdd: (report: Omit<Report, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<Report>) => void;
  onDelete: (id: string) => void;
}

export function Reports({ 
  reports, 
  officers, 
  incidents = [], 
  assignments = [], 
  user, 
  lang, 
  initialEditId, 
  onAdd, 
  onUpdate, 
  onDelete 
}: ReportsProps) {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOfficerId, setFilterOfficerId] = useState<string>('all');
  const [filterIncidentType, setFilterIncidentType] = useState<'all' | 'Crime' | 'Traffic'>('all');
  const [filterDatePreset, setFilterDatePreset] = useState<'all' | 'today' | '7days' | '30days' | 'month' | 'year' | 'custom'>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'Submitted' | 'Pending Review'>('all');
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  
  // PDF Export Configuration states
  const [pdfSummaryType, setPdfSummaryType] = useState<'all' | 'incidents' | 'assignments' | 'reports'>('reports');
  const [pdfDateFilter, setPdfDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'year'>('all');
  const [pdfStatusFilter, setPdfStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [pdfIncludeStats, setPdfIncludeStats] = useState(true);
  const [pdfIncludeSignatures, setPdfIncludeSignatures] = useState(true);

  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<{ blob: Blob, name: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  React.useEffect(() => {
    if (initialEditId) {
      const report = reports.find(r => r.id === initialEditId);
      if (report) {
        setEditingReport(report);
        setNewReport({
          title: report.title,
          status: report.status,
          date: report.date,
          location: report.location || '',
          officerId: report.officerId,
          filingStation: report.filingStation,
          recordingOfficerName: report.recordingOfficerName,
          recordingOfficerRank: report.recordingOfficerRank,
          type: report.type,
          category: report.category,
          description: report.description,
          photos: report.photos || [],
          documents: report.documents || [],
          document_url: report.document_url || '',
          voice_url: report.voice_url || '',
          trafficDetails: report.trafficDetails || {
            accidentType: 'pedestrianCollision',
            accidentImpact: 'death',
            numDeaths: 0,
            numHeavyInjuries: 0,
            numLightInjuries: 0,
            propertyDamageEstimate: '',
            driverExperience: 'exp1to5',
            vehicleType: 'vPrivate',
            plateNumber: '',
            licenseGrade: 'lAutomobile',
            reporterName: '',
            reporterAddress: '',
            reporterPhone: '',
            reporterOther: ''
          }
        });
        setIsModalOpen(true);
      }
    }
  }, [initialEditId, reports]);
  const [newReport, setNewReport] = useState<Omit<Report, 'id'>>({
    title: '',
    status: 'Pending Review',
    date: new Date().toISOString().split('T')[0],
    officerId: officers[0]?.id || '',
    filingStation: '',
    recordingOfficerName: officers[0]?.name || '',
    recordingOfficerRank: officers[0]?.rank || 'constable',
    type: 'Crime',
    category: 'other',
    description: '',
    photos: [] as string[],
    documents: [] as { name: string; url: string }[],
    voice_url: '',
    trafficDetails: {
      accidentType: 'pedestrianCollision',
      accidentImpact: 'death',
      numDeaths: 0,
      numHeavyInjuries: 0,
      numLightInjuries: 0,
      propertyDamageEstimate: '',
      driverExperience: 'exp1to5',
      vehicleType: 'vPrivate',
      plateNumber: '',
      licenseGrade: 'lAutomobile',
      accidentCause: 'Other',
      reporterName: '',
      reporterAddress: '',
      reporterPhone: '',
      reporterOther: ''
    }
  });

  const [activeAudio, setActiveAudio] = useState<string | null>(null);

  const handlePhotoUpload = async () => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt
      });

      if (image.dataUrl) {
        setNewReport(prev => ({
          ...prev,
          photos: [...(prev.photos || []), image.dataUrl!].slice(0, 10)
        }));
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const removePhoto = (index: number) => {
    setNewReport(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  const handleDocUpload = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const result = await FilePicker.pickFiles({
          types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });
        
        if (result.files.length > 0) {
          const newDocs: { blob: Blob, name: string }[] = [];
          for (const file of result.files) {
            if (file.path) {
              const response = await fetch(Capacitor.convertFileSrc(file.path));
              const blob = await response.blob();
              newDocs.push({ 
                blob, 
                name: file.name || `doc_${Date.now()}` 
              });
            }
          }
          setSelectedDocs(prev => [...prev, ...newDocs]);
        }
      } catch (err) {
        console.error("File picker error:", err);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.doc,.docx';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length > 0) {
          const newDocs = files.map(file => ({ blob: file, name: file.name }));
          setSelectedDocs(prev => [...prev, ...newDocs]);
        }
      };
      input.click();
    }
  };

  const removeDoc = (index: number) => {
    setSelectedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingDoc = (index: number) => {
    setNewReport(prev => ({
      ...prev,
      documents: (prev.documents || []).filter((_, i) => i !== index)
    }));
  };

  // Update default officer when officers list is loaded
  useEffect(() => {
    if (officers.length > 0 && !newReport.officerId) {
      setNewReport(prev => ({ ...prev, officerId: officers[0].id }));
    }
  }, [officers, newReport.officerId]);

  // Date filter evaluation
  const isWithinDateFilter = (reportDate: string) => {
    if (!reportDate) return true;
    if (filterDatePreset === 'all' && !filterStartDate && !filterEndDate) return true;

    // Explicit custom date range
    if (filterStartDate || filterEndDate) {
      const cleanDate = reportDate.slice(0, 10);
      if (filterStartDate && cleanDate < filterStartDate) return false;
      if (filterEndDate && cleanDate > filterEndDate) return false;
      return true;
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (filterDatePreset === 'today') {
      return reportDate.startsWith(todayStr);
    }

    try {
      const d = new Date(reportDate);
      if (isNaN(d.getTime())) return true;
      const diffMs = now.getTime() - d.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (filterDatePreset === '7days') return diffDays >= 0 && diffDays <= 7.5;
      if (filterDatePreset === '30days') return diffDays >= 0 && diffDays <= 30.5;
      if (filterDatePreset === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (filterDatePreset === 'year') return d.getFullYear() === now.getFullYear();
    } catch {
      return true;
    }
    return true;
  };

  // Officer filter evaluation
  const matchesOfficerFilter = (report: Report) => {
    if (!filterOfficerId || filterOfficerId === 'all') return true;
    if (report.officerId === filterOfficerId) return true;
    const selOfficer = officers.find(o => o.id === filterOfficerId);
    if (selOfficer && report.recordingOfficerName) {
      return report.recordingOfficerName.toLowerCase().includes(selOfficer.name.toLowerCase());
    }
    return false;
  };

  // Incident type filter evaluation
  const matchesTypeFilter = (report: Report) => {
    if (!filterIncidentType || filterIncidentType === 'all') return true;
    return report.type === filterIncidentType;
  };

  // Status filter evaluation
  const matchesStatusFilter = (report: Report) => {
    if (!filterStatus || filterStatus === 'all') return true;
    return report.status === filterStatus;
  };

  // Search keyword evaluation
  const matchesSearchTerm = (report: Report) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (report.title || '').toLowerCase().includes(q) ||
      (report.category || '').toLowerCase().includes(q) ||
      (report.recordingOfficerName || '').toLowerCase().includes(q) ||
      (report.filingStation || '').toLowerCase().includes(q) ||
      (report.location || '').toLowerCase().includes(q) ||
      (report.description || '').toLowerCase().includes(q)
    );
  };

  // Combined filtered reports
  const filteredReports = reports.filter(r => 
    matchesSearchTerm(r) &&
    isWithinDateFilter(r.date) &&
    matchesOfficerFilter(r) &&
    matchesTypeFilter(r) &&
    matchesStatusFilter(r)
  );

  const activeFilterCount = (searchTerm.trim() ? 1 : 0) +
    (filterOfficerId !== 'all' ? 1 : 0) +
    (filterIncidentType !== 'all' ? 1 : 0) +
    (filterDatePreset !== 'all' || filterStartDate || filterEndDate ? 1 : 0) +
    (filterStatus !== 'all' ? 1 : 0);

  const handleResetFilters = () => {
    setSearchTerm('');
    setFilterOfficerId('all');
    setFilterIncidentType('all');
    setFilterDatePreset('all');
    setFilterStartDate('');
    setFilterEndDate('');
    setFilterStatus('all');
  };

  useEffect(() => {
    if (isRecording) {
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  // Alias to standard MediaRecorder (must be declared before use)
  const NewMediaRecorder = window.MediaRecorder;

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm' 
        : MediaRecorder.isTypeSupported('audio/mp4') 
          ? 'audio/mp4' 
          : 'audio/ogg';

      const mediaRecorder = new NewMediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);
      mediaRecorder.ondataavailable = (e) => e.data.size > 0 && audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error(err);
      setErrorMessage(lang === 'am' ? 'ማይክሮፎን ማግኘት አልተቻለም (እባክዎን የፈቃድ ጥያቄውን ይቀበሉ)' : 'Could not access microphone (please allow access)');
    }
  };


  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleEdit = (report: Report) => {
    setEditingReport(report);
    setNewReport({
      ...report,
      trafficDetails: report.type === 'Traffic' ? {
        accidentType: 'pedestrianCollision',
        accidentImpact: 'death',
        numDeaths: 0,
        numHeavyInjuries: 0,
        numLightInjuries: 0,
        propertyDamageEstimate: '',
        driverExperience: 'exp1to5',
        vehicleType: 'vPrivate',
        plateNumber: '',
        licenseGrade: 'lAutomobile',
        accidentCause: 'Other',
        reporterName: '',
        reporterAddress: '',
        reporterPhone: '',
        reporterOther: '',
        ...report.trafficDetails
      } : report.trafficDetails
    });
    setIsModalOpen(true);
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!newReport.title.trim() || newReport.title.length < 3) {
      setErrorMessage(lang === 'am' ? 'እባክዎ ትክክለኛ ርዕስ ያስገቡ (ቢያንስ 3 ፊደላት)' : 'Please enter a valid title (min 3 characters)');
      return;
    }
    if (!newReport.officerId) {
      setErrorMessage(lang === 'am' ? 'እባክዎ መኮንን ይምረጡ' : 'Please select an officer');
      return;
    }
    if (!newReport.date) {
      setErrorMessage(lang === 'am' ? 'እባክዎ ቀን ይምረጡ' : 'Please select a date');
      return;
    }
    if (!newReport.description?.trim() || newReport.description.length < 10) {
      setErrorMessage(lang === 'am' ? 'እባክዎ ዝርዝር መግለጫ ያስገቡ (ቢያንስ 10 ፊደላት)' : 'Please enter a detailed description (min 10 characters)');
      return;
    }

    setErrorMessage(null);

    setIsSubmitting(true);
    try {
      let finalVoiceUrl = newReport.voice_url;
      let finalDocuments = [...(newReport.documents || [])];
      let finalPhotos = [...(newReport.photos || [])];

      const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
      const { storage } = await import('../firebase');

      if (audioBlob) {
        const extension = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
        const voiceRef = ref(storage, `reports/${Date.now()}_voice.${extension}`);
        const snapshot = await uploadBytes(voiceRef, audioBlob, { contentType: audioBlob.type });
        finalVoiceUrl = await getDownloadURL(snapshot.ref);
      }

      // Upload new documents
      if (selectedDocs.length > 0) {
        const uploadPromises = selectedDocs.map(async (docObj) => {
          const docRef = ref(storage, `reports/${Date.now()}_${docObj.name}`);
          const snapshot = await uploadBytes(docRef, docObj.blob);
          const url = await getDownloadURL(snapshot.ref);
          return { name: docObj.name, url };
        });
        const uploadedDocs = await Promise.all(uploadPromises);
        finalDocuments = [...finalDocuments, ...uploadedDocs];
      }

      // Upload photos
      finalPhotos = await Promise.all((newReport.photos || []).map(async (photo) => {
        if (photo.startsWith('data:')) {
          const photoRef = ref(storage, `reports/${Date.now()}_photo.jpg`);
          const response = await fetch(photo);
          const blob = await response.blob();
          const snapshot = await uploadBytes(photoRef, blob, { contentType: 'image/jpeg' });
          return await getDownloadURL(snapshot.ref);
        }
        return photo; // Already a URL
      }));

      const reportData = { 
        ...newReport, 
        voice_url: finalVoiceUrl, 
        documents: finalDocuments,
        photos: finalPhotos,
        // For backward compatibility
        document_url: finalDocuments.length > 0 ? finalDocuments[0].url : newReport.document_url 
      };

      if (editingReport) {
        await onUpdate(editingReport.id, reportData);
      } else {
        await onAdd(reportData);
      }
      
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        handleCloseModal();
      }, 2000);
    } catch (err) {
      console.error(err);
      setErrorMessage(lang === 'am' ? 'ሪፖርት ሲላክ ስህተት ተፈጥሯል (እባክዎን የኢንተርኔት ግንኙነትዎን ያረጋግጡ)' : 'Error submitting report (please verify your network connection)');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">Report Title</label>
              <input 
                required
                type="text" 
                className="input-field" 
                placeholder="e.g. Incident 001 Final Report"
                value={newReport.title}
                onChange={(e) => setNewReport({...newReport, title: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.type}</label>
                <select 
                  className="input-field"
                  value={newReport.type}
                  onChange={(e) => setNewReport({...newReport, type: e.target.value as any, category: 'other'})}
                >
                  <option value="Crime">{t.crime}</option>
                  <option value="Traffic">{t.traffic}</option>
                </select>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.selectCategory}</label>
                <select 
                  className="input-field"
                  value={newReport.category}
                  onChange={(e) => setNewReport({...newReport, category: e.target.value})}
                >
                  {newReport.type === 'Crime' ? (
                    Object.entries(t.categories.crime).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))
                  ) : (
                    Object.entries(t.categories.traffic).map(([key, label]) => (
                      <option key={key} value={key}>{label as string}</option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.filingStation}</label>
                <select 
                  required
                  className="input-field"
                  value={newReport.filingStation}
                  onChange={(e) => setNewReport({...newReport, filingStation: e.target.value})}
                >
                  <option value="">{t.stationPlaceholder}</option>
                  {Object.entries(t.stations).map(([key, label]) => (
                    <option key={key} value={label as string}>{label as string}</option>
                  ))}
                </select>
              </div>
              <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.date}</label>
                <input 
                  required
                  type="date" 
                  className="input-field" 
                  value={newReport.date}
                  onChange={(e) => setNewReport({...newReport, date: e.target.value})}
                />
              </div>
            </div>

            {newReport.type === 'Traffic' && (
              <div className="space-y-6 border-t border-brand-border pt-6">
                <h3 className="text-lg font-bold text-brand-accent mb-4">{(t as any).trafficForm.accidentType}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.accidentType}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.accidentType}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, accidentType: e.target.value}})}
                    >
                      <option value="pedestrianCollision">{(t as any).trafficForm.pedestrianCollision}</option>
                      <option value="vehicleToVehicle">{(t as any).trafficForm.vehicleToVehicle}</option>
                      <option value="overturning">{(t as any).trafficForm.overturning}</option>
                      <option value="objectCollision">{(t as any).trafficForm.objectCollision}</option>
                      <option value="falling">{(t as any).trafficForm.falling}</option>
                    </select>
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.accidentCause || 'Accident Cause'}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.accidentCause}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, accidentCause: e.target.value}})}
                    >
                      <option value="Other">{(t as any).other || 'Other'}</option>
                      <option value="Speeding">{lang === 'am' ? 'ከፍጥነት በላይ' : 'Speeding'}</option>
                      <option value="DrunkDriving">{lang === 'am' ? 'በስካር መንዳት' : 'Drunk Driving'}</option>
                      <option value="Technical">{lang === 'am' ? 'የቴክኒክ ችግር' : 'Technical Issue'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numDeaths}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newReport.trafficDetails?.numDeaths}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, numDeaths: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numHeavyInjuries}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newReport.trafficDetails?.numHeavyInjuries}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, numHeavyInjuries: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.numLightInjuries}</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      value={newReport.trafficDetails?.numLightInjuries}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, numLightInjuries: parseInt(e.target.value) || 0}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.propertyEstimate}</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 50,000 ETB"
                      className="input-field" 
                      value={newReport.trafficDetails?.propertyDamageEstimate}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, propertyDamageEstimate: e.target.value}})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.driverExperience}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.driverExperience}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, driverExperience: e.target.value}})}
                    >
                      <option value="exp1to5">{(t as any).trafficForm.exp1to5}</option>
                      <option value="exp5to10">{(t as any).trafficForm.exp5to10}</option>
                      <option value="expAbove10">{(t as any).trafficForm.expAbove10}</option>
                    </select>
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.vehicleType}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.vehicleType}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, vehicleType: e.target.value}})}
                    >
                      <option value="vPublic">{(t as any).trafficForm.vPublic}</option>
                      <option value="vPrivate">{(t as any).trafficForm.vPrivate}</option>
                      <option value="vFreight">{(t as any).trafficForm.vFreight}</option>
                      <option value="vMotorcycle">{(t as any).trafficForm.vMotorcycle}</option>
                      <option value="vOther">{(t as any).trafficForm.vOther}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.plateNumber}</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      value={newReport.trafficDetails?.plateNumber}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, plateNumber: e.target.value}})}
                    />
                  </div>
                  <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
                    <label className="block text-sm font-medium text-brand-text-secondary mb-2">{(t as any).trafficForm.licenseGrade}</label>
                    <select 
                      className="input-field"
                      value={newReport.trafficDetails?.licenseGrade}
                      onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, licenseGrade: e.target.value}})}
                    >
                      <option value="lPublic1">{(t as any).trafficForm.lPublic1}</option>
                      <option value="lPublic2">{(t as any).trafficForm.lPublic2}</option>
                      <option value="lDry1">{(t as any).trafficForm.lDry1}</option>
                      <option value="lDry2">{(t as any).trafficForm.lDry2}</option>
                      <option value="lDry3">{(t as any).trafficForm.lDry3}</option>
                      <option value="lLiquid1">{(t as any).trafficForm.lLiquid1}</option>
                      <option value="lLiquid2">{(t as any).trafficForm.lLiquid2}</option>
                      <option value="lAutomobile">{(t as any).trafficForm.lAutomobile}</option>
                    </select>
                  </div>
                </div>

                <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm space-y-4">
                  <h4 className="text-sm font-bold text-brand-text-primary underline">{(t as any).trafficForm.reporterInfo}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterName}</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newReport.trafficDetails?.reporterName}
                        onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, reporterName: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterAddress}</label>
                      <input 
                        type="text" 
                        className="input-field" 
                        value={newReport.trafficDetails?.reporterAddress}
                        onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, reporterAddress: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-brand-text-secondary mb-1">{(t as any).trafficForm.reporterPhone}</label>
                      <input 
                        type="tel" 
                        className="input-field" 
                        value={newReport.trafficDetails?.reporterPhone}
                        onChange={(e) => setNewReport({...newReport, trafficDetails: {...newReport.trafficDetails, reporterPhone: e.target.value}})}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.recordingOfficer}</label>
              <select 
                required
                className="input-field"
                value={newReport.officerId}
                onChange={(e) => {
                  const selectedOfficer = officers.find(o => o.id === e.target.value);
                  if (selectedOfficer) {
                    setNewReport({
                      ...newReport, 
                      officerId: selectedOfficer.id,
                      recordingOfficerName: selectedOfficer.name,
                      recordingOfficerRank: selectedOfficer.rank
                    });
                  }
                }}
              >
                <option value="">{t.selectOfficer || 'Select Officer'}</option>
                {officers.map((officer) => (
                  <option key={officer.id} value={officer.id}>
                    {officer.name} ({(t.ranks as any)[officer.rank] || officer.rank})
                  </option>
                ))}
              </select>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.detailedDescription}</label>
              <textarea 
                className="input-field min-h-[100px]"
                placeholder={t.descriptionPlaceholder}
                value={newReport.description}
                onChange={(e) => setNewReport({...newReport, description: e.target.value})}
              />
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-3">{t.attachFiles || 'Attach Photos & Documents'}</label>
              <div className="grid grid-cols-4 gap-4">
                {(newReport.photos || []).map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border border-brand-border group">
                    <img src={photo} alt="Report" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {(newReport.photos || []).length < 10 && (
                  <button 
                    type="button"
                    onClick={handlePhotoUpload}
                    className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer"
                  >
                    <Camera size={24} className="text-brand-text-secondary" />
                    <span className="text-[10px] uppercase font-bold text-brand-text-secondary">
                      {lang === 'am' ? 'ፎቶ' : 'Photo'}
                    </span>
                  </button>
                )}
                
                {/* Existing Documents */}
                {(newReport.documents || []).map((doc, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square rounded-xl border border-emerald-500 bg-emerald-500/5 flex flex-col items-center justify-center gap-1 group overflow-hidden">
                    <FileCheck size={24} className="text-emerald-500" />
                    <span className="text-[8px] font-bold text-emerald-500 truncate w-full px-1 text-center">{doc.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeExistingDoc(index)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}

                {/* New Selected Documents */}
                {selectedDocs.map((doc, index) => (
                  <div key={`new-${index}`} className="relative aspect-square rounded-xl border-2 border-brand-accent bg-brand-accent/5 flex flex-col items-center justify-center gap-1 group overflow-hidden">
                    <FileIcon size={24} className="text-brand-accent" />
                    <span className="text-[8px] font-bold text-brand-accent truncate w-full px-1 text-center">{doc.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeDoc(index)}
                      className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                ))}

                <button 
                  type="button"
                  onClick={handleDocUpload}
                  className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer"
                >
                  <FileIcon size={24} className="text-brand-text-secondary" />
                  <span className="text-[10px] uppercase font-bold text-brand-text-secondary">
                    {lang === 'am' ? 'ሰነድ' : 'File'}
                  </span>
                </button>
              </div>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-brand-text-secondary">{t.recordAudio || 'Voice Note'}</label>
                {isRecording && (
                  <span className="text-xs font-mono text-rose-500 animate-pulse font-bold">
                    {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')} / 1:00
                  </span>
                )}
                {!isRecording && audioBlob && (
                  <span className="text-xs font-mono text-emerald-500 font-bold">
                    {t.recordingReady || 'Recording Ready'}
                  </span>
                )}
              </div>
              {!isRecording && !audioUrl ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all group"
                >
                  <div className="p-2 rounded-full bg-rose-500/10 group-hover:bg-rose-500/20 transition-all">
                    <Mic size={20} />
                  </div>
                  <span className="font-bold">{t.recordAudio || 'Start Voice Note (Max 60s)'}</span>
                </button>
              ) : isRecording ? (
                <div className="space-y-4">
                  <div className="flex justify-center items-center gap-1 h-8">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        animate={{ height: [4, Math.random() * 20 + 4, 4] }}
                        transition={{ repeat: Infinity, duration: 0.5, delay: i * 0.05 }}
                        className="w-1 bg-rose-500 rounded-full"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="w-full flex items-center justify-center gap-2 py-4 bg-rose-500 text-white rounded-lg shadow-lg shadow-rose-500/20 transition-all"
                  >
                    <Square size={20} fill="currentColor" />
                    <span className="font-bold">{t.stopRecording || 'Stop & Save'}</span>
                  </button>
                </div>
              ) : (
                <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-full">
                      <Volume2 size={20} />
                    </div>
                    <audio src={audioUrl!} controls className="flex-1 h-10 custom-audio-player" />
                    <button
                      type="button"
                      onClick={deleteRecording}
                      className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all"
                      title={t.delete || 'Delete'}
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-brand-accent/5 p-4 rounded-xl border border-brand-accent/20 space-y-3">
              <div className="flex items-center gap-2 text-brand-accent">
                <Info size={18} />
                <h4 className="font-bold text-sm uppercase tracking-wider">{(translations[lang] as any).summary || 'Summary'}</h4>
              </div>
              <p className="text-xs text-brand-text-secondary italic">{(translations[lang] as any).confirmDetails || 'Please confirm your details before sending'}</p>
              <div className="grid grid-cols-2 gap-y-2 text-xs">
                <span className="text-brand-text-secondary">Report Title:</span>
                <span className="font-bold">{newReport.title}</span>
                <span className="text-brand-text-secondary">{t.type}:</span>
                <span className="font-bold">{newReport.type}</span>
                <span className="text-brand-text-secondary">{t.filingStation}:</span>
                <span className="font-bold">{newReport.filingStation}</span>
                <span className="text-brand-text-secondary">{t.date}:</span>
                <span className="font-bold">{newReport.date}</span>
                {((newReport.documents || []).length > 0 || selectedDocs.length > 0) && (
                  <>
                    <span className="text-brand-text-secondary">Documents:</span>
                    <span className="font-bold text-emerald-400">
                      {(newReport.documents || []).length + selectedDocs.length} files
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReport(null);
    setCurrentStep(1);
    setAudioBlob(null);
    setAudioUrl(null);
    setSelectedDocs([]);
    setErrorMessage(null);
    setNewReport({ 
      title: '', 
      status: 'Pending Review', 
      date: new Date().toISOString().split('T')[0], 
      officerId: officers[0]?.id || '',
      filingStation: '',
      recordingOfficerName: officers[0]?.name || '',
      recordingOfficerRank: officers[0]?.rank || 'constable',
      type: 'Crime',
      category: 'other',
      description: '',
      photos: [],
      documents: [],
      voice_url: '',
      trafficDetails: {
        accidentType: 'pedestrianCollision',
        accidentImpact: 'death',
        numDeaths: 0,
        numHeavyInjuries: 0,
        numLightInjuries: 0,
        propertyDamageEstimate: '',
        driverExperience: 'exp1to5',
        vehicleType: 'vPrivate',
        plateNumber: '',
        licenseGrade: 'lAutomobile',
        accidentCause: 'Other',
        reporterName: '',
        reporterAddress: '',
        reporterPhone: '',
        reporterOther: ''
      }
    });
  };

  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await new Promise(r => setTimeout(r, 200));

      const isReportsMode = pdfSummaryType === 'reports';
      const targetReports = isReportsMode ? filteredReports : reports;
      const currentOfficer = officers.find(o => o.id === filterOfficerId);

      exportIncidentAssignmentSummaryPDF({
        incidents,
        assignments,
        officers,
        reports: targetReports,
        user,
        lang,
        summaryType: pdfSummaryType,
        dateFilter: filterDatePreset !== 'all' ? filterDatePreset : pdfDateFilter,
        startDate: filterStartDate,
        endDate: filterEndDate,
        officerFilter: filterOfficerId !== 'all' ? filterOfficerId : 'all',
        incidentTypeFilter: filterIncidentType !== 'all' ? filterIncidentType : 'all',
        statusFilter: filterStatus !== 'all' ? filterStatus : pdfStatusFilter,
        includeStats: pdfIncludeStats,
        includeSignatures: pdfIncludeSignatures,
        activeFilterSummary: {
          dateRangeText: filterDatePreset === 'custom' 
            ? `${filterStartDate || 'Start'} to ${filterEndDate || 'Present'}`
            : filterDatePreset !== 'all' ? filterDatePreset : undefined,
          officerName: currentOfficer?.name,
          incidentType: filterIncidentType !== 'all' ? filterIncidentType : undefined,
          searchTerm: searchTerm.trim() || undefined
        }
      });
      setExportSuccessMessage(lang === 'am' ? 'የማጠቃለያ PDF ሰነዱ በተሳካ ሁኔታ ተዘጋጅቶ ወርዷል!' : 'Official Summary PDF successfully generated and downloaded!');
      setTimeout(() => {
        setIsExportModalOpen(false);
        setExportSuccessMessage(null);
      }, 1600);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert(lang === 'am' ? 'PDF ለማዘጋጀት አልተቻለም። እባክዎ እንደገና ይሞክሩ።' : 'Failed to generate PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t.reports || 'Reports'}</h1>
          <p className="text-brand-text-secondary">Official documentation, incident archives, and case reports.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            id="export-to-pdf-btn"
            onClick={() => setIsExportModalOpen(true)} 
            className="px-4 py-2.5 bg-brand-bg/90 hover:bg-brand-bg text-brand-text border border-brand-border hover:border-brand-accent/50 rounded-xl transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow text-sm group"
            title={lang === 'am' ? 'የክስተት እና የስራ ምደባ ማጠቃለያ ወደ PDF አውርድ' : 'Export Incident & Assignment Summaries to PDF'}
          >
            <Download size={18} className="text-brand-accent group-hover:scale-110 transition-transform" />
            <span className="font-semibold">{lang === 'am' ? 'ወደ PDF አውርድ' : 'Export to PDF'}</span>
            {activeFilterCount > 0 && (
              <span className="text-[10px] bg-brand-accent/20 text-brand-accent px-1.5 py-0.5 rounded font-bold">
                {filteredReports.length}
              </span>
            )}
            <span className="text-[10px] bg-brand-accent/15 text-brand-accent px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              {lang === 'am' ? 'አስተዳዳሪ' : 'Admin'}
            </span>
          </button>

          <button id="new-report-btn" onClick={() => setIsModalOpen(true)} className="btn-primary">
            <Plus size={18} />
            {t.newReport}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="glass-card p-6 border-l-4 border-brand-accent">
          <p className="text-brand-text-secondary text-sm font-medium mb-1">Total Reports</p>
          <h3 className="text-2xl font-bold">{reports.length}</h3>
        </div>
        <div className="glass-card p-6 border-l-4 border-emerald-500">
          <p className="text-brand-text-secondary text-sm font-medium mb-1">Submitted</p>
          <h3 className="text-2xl font-bold">{reports.filter(r => r.status === 'Submitted').length}</h3>
        </div>
        <div className="glass-card p-6 border-l-4 border-amber-500">
          <p className="text-brand-text-secondary text-sm font-medium mb-1">Pending Review</p>
          <h3 className="text-2xl font-bold">{reports.filter(r => r.status === 'Pending Review').length}</h3>
        </div>
      </div>

      {/* Comprehensive Search & Filter Bar for Incident Reports */}
      <div className="glass-card p-5 space-y-4 border border-brand-border/80 shadow-sm rounded-2xl">
        {/* Top Search & Filter Summary Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary" size={18} />
            <input 
              id="report-search-input"
              type="text" 
              placeholder={lang === 'am' ? 'በአርእስት፣ በጣቢያ፣ በኦፊሰር ስም ወይም መግለጫ ፈልግ...' : 'Search by report title, filing station, officer, or details...'} 
              className="input-field pl-10 pr-9 py-2.5 text-sm w-full bg-brand-bg/80 focus:bg-brand-bg transition-colors"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-secondary hover:text-brand-text p-1 transition-colors"
                title="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Incident Type Toggle Pills */}
          <div className="flex items-center gap-1.5 bg-brand-bg/80 p-1 rounded-xl border border-brand-border shrink-0 self-start md:self-auto">
            <button
              type="button"
              id="filter-type-all"
              onClick={() => setFilterIncidentType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterIncidentType === 'all'
                  ? 'bg-brand-accent text-brand-bg shadow-sm font-bold'
                  : 'text-brand-text-secondary hover:text-brand-text'
              }`}
            >
              {lang === 'am' ? 'ሁሉም አይነቶች' : 'All Types'}
            </button>
            <button
              type="button"
              id="filter-type-crime"
              onClick={() => setFilterIncidentType('Crime')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterIncidentType === 'Crime'
                  ? 'bg-rose-500 text-white shadow-sm font-bold'
                  : 'text-brand-text-secondary hover:text-rose-400'
              }`}
            >
              <Shield size={13} />
              <span>{lang === 'am' ? 'ወንጀል' : 'Crime'}</span>
            </button>
            <button
              type="button"
              id="filter-type-traffic"
              onClick={() => setFilterIncidentType('Traffic')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterIncidentType === 'Traffic'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-brand-text-secondary hover:text-blue-400'
              }`}
            >
              <Car size={13} />
              <span>{lang === 'am' ? 'ትራፊክ' : 'Traffic'}</span>
            </button>
          </div>

          {/* Filter Collapse / Expand Toggle */}
          <button
            type="button"
            id="toggle-filter-controls-btn"
            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-all ${
              activeFilterCount > 0
                ? 'bg-brand-accent/15 border-brand-accent/40 text-brand-accent'
                : 'bg-brand-bg border-brand-border text-brand-text-secondary hover:text-brand-text'
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>{isFilterExpanded ? (lang === 'am' ? 'ማጣሪያዎችን አሳንስ' : 'Filters') : (lang === 'am' ? 'ተጨማሪ ማጣሪያዎች' : 'More Filters')}</span>
            {activeFilterCount > 0 && (
              <span className="bg-brand-accent text-brand-bg px-1.5 py-0.2 text-[10px] rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Collapsible Detailed Filter Controls Grid */}
        <AnimatePresence>
          {isFilterExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-brand-border/60 pt-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Date Range Preset Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar size={13} className="text-brand-accent" />
                    <span>{lang === 'am' ? 'የቀን ክልል (Date Range)' : 'Date Range'}</span>
                  </label>
                  <select
                    id="filter-date-preset"
                    value={filterDatePreset}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setFilterDatePreset(val);
                      if (val !== 'custom') {
                        setFilterStartDate('');
                        setFilterEndDate('');
                      }
                    }}
                    className="input-field text-xs py-2 bg-brand-bg/90"
                  >
                    <option value="all">{lang === 'am' ? 'ሁሉም ቀናት (All Dates)' : 'All Dates'}</option>
                    <option value="today">{lang === 'am' ? 'ዛሬ (Today)' : 'Today'}</option>
                    <option value="7days">{lang === 'am' ? 'ያለፉት 7 ቀናት (Past 7 Days)' : 'Past 7 Days'}</option>
                    <option value="30days">{lang === 'am' ? 'ያለፉት 30 ቀናት (Past 30 Days)' : 'Past 30 Days'}</option>
                    <option value="month">{lang === 'am' ? 'የዚህ ወር (This Month)' : 'This Month'}</option>
                    <option value="year">{lang === 'am' ? 'የዚህ ዓመት (This Year)' : 'This Year'}</option>
                    <option value="custom">{lang === 'am' ? 'የተወሰነ የቀን ክልል (Custom Range...)' : 'Custom Date Range...'}</option>
                  </select>
                </div>

                {/* 2. Officer Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserCheck size={13} className="text-brand-accent" />
                    <span>{lang === 'am' ? 'ኦፊሰር (Officer)' : 'Officer'}</span>
                  </label>
                  <select
                    id="filter-officer-select"
                    value={filterOfficerId}
                    onChange={(e) => setFilterOfficerId(e.target.value)}
                    className="input-field text-xs py-2 bg-brand-bg/90"
                  >
                    <option value="all">{lang === 'am' ? 'ሁሉም ኦፊሰሮች (All Officers)' : 'All Officers'}</option>
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name} ({(t.ranks as any)[officer.rank] || officer.rank})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Incident Type Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Filter size={13} className="text-brand-accent" />
                    <span>{lang === 'am' ? 'የክስተቱ አይነት (Type)' : 'Incident Type'}</span>
                  </label>
                  <select
                    id="filter-incident-type-select"
                    value={filterIncidentType}
                    onChange={(e) => setFilterIncidentType(e.target.value as any)}
                    className="input-field text-xs py-2 bg-brand-bg/90"
                  >
                    <option value="all">{lang === 'am' ? 'ሁሉም አይነቶች (All Types)' : 'All Incident Types'}</option>
                    <option value="Crime">{lang === 'am' ? 'ወንጀል (Crime Only)' : 'Crime Only'}</option>
                    <option value="Traffic">{lang === 'am' ? 'ትራፊክ (Traffic Only)' : 'Traffic Only'}</option>
                  </select>
                </div>

                {/* 4. Report Status Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-brand-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <CheckCircle size={13} className="text-brand-accent" />
                    <span>{lang === 'am' ? 'የሪፖርት ሁኔታ (Status)' : 'Report Status'}</span>
                  </label>
                  <select
                    id="filter-status-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="input-field text-xs py-2 bg-brand-bg/90"
                  >
                    <option value="all">{lang === 'am' ? 'ሁሉም ሁኔታዎች (All Statuses)' : 'All Statuses'}</option>
                    <option value="Submitted">{lang === 'am' ? 'የቀረበ / የተመዘገበ (Submitted)' : 'Submitted'}</option>
                    <option value="Pending Review">{lang === 'am' ? 'በግምገማ ላይ (Pending Review)' : 'Pending Review'}</option>
                  </select>
                </div>
              </div>

              {/* Custom Date Pickers */}
              {filterDatePreset === 'custom' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 p-3 bg-brand-bg/40 rounded-xl border border-brand-border/60">
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary uppercase tracking-wider mb-1">
                      {lang === 'am' ? 'የመጀመሪያ ቀን (Start Date)' : 'Start Date (From)'}
                    </label>
                    <input 
                      id="filter-start-date"
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="input-field text-xs py-1.5 bg-brand-bg"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-brand-text-secondary uppercase tracking-wider mb-1">
                      {lang === 'am' ? 'የመጨረሻ ቀን (End Date)' : 'End Date (To)'}
                    </label>
                    <input 
                      id="filter-end-date"
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="input-field text-xs py-1.5 bg-brand-bg"
                    />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results Counter & Active Filter Pills Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-brand-border/40">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-brand-text-secondary">
              {lang === 'am' ? 'የሚታዩት:' : 'Showing:'}{' '}
              <strong className="text-brand-text font-bold">{filteredReports.length}</strong>{' '}
              {lang === 'am' ? 'ከ' : 'of'}{' '}
              <strong className="text-brand-text">{reports.length}</strong> {lang === 'am' ? 'ሪፖርቶች' : 'reports'}
            </span>

            {/* Active filter badges */}
            {filterIncidentType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-accent/15 text-brand-accent font-medium text-[11px] border border-brand-accent/25">
                <span>{filterIncidentType === 'Crime' ? (lang === 'am' ? 'ወንጀል' : 'Crime') : (lang === 'am' ? 'ትራፊክ' : 'Traffic')}</span>
                <button onClick={() => setFilterIncidentType('all')} className="hover:text-white" title="Remove filter"><X size={11} /></button>
              </span>
            )}
            {filterOfficerId !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-accent/15 text-brand-accent font-medium text-[11px] border border-brand-accent/25">
                <span>{officers.find(o => o.id === filterOfficerId)?.name || 'Officer'}</span>
                <button onClick={() => setFilterOfficerId('all')} className="hover:text-white" title="Remove filter"><X size={11} /></button>
              </span>
            )}
            {filterDatePreset !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-accent/15 text-brand-accent font-medium text-[11px] border border-brand-accent/25">
                <span>
                  {filterDatePreset === 'custom' 
                    ? `${filterStartDate || 'Start'} -> ${filterEndDate || 'End'}` 
                    : filterDatePreset}
                </span>
                <button onClick={() => { setFilterDatePreset('all'); setFilterStartDate(''); setFilterEndDate(''); }} className="hover:text-white" title="Remove filter"><X size={11} /></button>
              </span>
            )}
            {filterStatus !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-accent/15 text-brand-accent font-medium text-[11px] border border-brand-accent/25">
                <span>{filterStatus}</span>
                <button onClick={() => setFilterStatus('all')} className="hover:text-white" title="Remove filter"><X size={11} /></button>
              </span>
            )}
            {searchTerm.trim() && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-bg text-brand-text-secondary font-medium text-[11px] border border-brand-border">
                <span>"{searchTerm}"</span>
                <button onClick={() => setSearchTerm('')} className="hover:text-brand-text" title="Remove search filter"><X size={11} /></button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                type="button"
                id="reset-filters-btn"
                onClick={handleResetFilters}
                className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
              >
                <RotateCcw size={12} />
                <span>{lang === 'am' ? 'ማጣሪያዎችን አጽዳ' : 'Clear Filters'}</span>
              </button>
            )}

            {/* Quick Export Filtered to PDF Button */}
            <button
              type="button"
              id="export-filtered-pdf-bar-btn"
              onClick={() => {
                setPdfSummaryType('reports');
                setIsExportModalOpen(true);
              }}
              className="px-3 py-1.5 bg-brand-accent/10 hover:bg-brand-accent/20 text-brand-accent border border-brand-accent/30 rounded-xl transition-all flex items-center gap-1.5 font-semibold text-xs shadow-sm hover:shadow"
              title={lang === 'am' ? 'የተጣሩትን ሪፖርቶች በPDF አውርድ' : 'Export current filtered reports to PDF'}
            >
              <Download size={13} />
              <span>
                {lang === 'am' 
                  ? `የተጣሩትን በPDF አውርድ (${filteredReports.length})` 
                  : `Export Filtered to PDF (${filteredReports.length})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-brand-bg/50 text-brand-text-secondary text-sm uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Report Title</th>
                <th className="px-6 py-4 font-semibold">Filing Station</th>
                <th className="px-6 py-4 font-semibold">Recording Officer</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredReports.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto border border-brand-accent/20">
                        <Filter size={22} />
                      </div>
                      <h4 className="font-bold text-base text-brand-text">
                        {lang === 'am' ? 'ከማጣሪያው ጋር የሚዛመድ ሪፖርት አልተገኘም' : 'No Incident Reports Match Your Filters'}
                      </h4>
                      <p className="text-xs text-brand-text-secondary leading-relaxed">
                        {lang === 'am' 
                          ? 'እባክዎ የፍለጋ ቃል፣ የቀን ክልል፣ የተመረጠ ኦፊሰር ወይም የክስተት አይነት ማጣሪያዎችን ይቀይሩ ወይም ያጽዱ።' 
                          : 'Try adjusting your search query, date range, selected officer, or incident type filters.'}
                      </p>
                      {activeFilterCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-2 mt-2 shadow-sm"
                        >
                          <RotateCcw size={13} />
                          <span>{lang === 'am' ? 'ሁሉንም ማጣሪያዎች አጽዳ' : 'Clear All Filters & Show All'}</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-brand-bg/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-bg rounded-lg border border-brand-border">
                          <FileText size={16} className="text-brand-accent" />
                        </div>
                        <div>
                          <p className="font-bold">{report.title}</p>
                          <p className="text-xs text-brand-text-secondary">
                            {report.type === 'Crime' 
                              ? (t.categories.crime as any)[report.category] 
                              : (t.categories.traffic as any)[report.category]}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-brand-text-secondary">
                      {report.filingStation}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold">{report.recordingOfficerName}</span>
                        <span className="text-[10px] text-brand-text-secondary uppercase">
                          {(t.ranks as any)[report.recordingOfficerRank]}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                        ${report.status === 'Submitted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}
                      `}>
                        {(t.reportStatuses as any)[report.status] || report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {report.voice_url && (
                          <div className="flex items-center gap-1">
                            {activeAudio === report.id ? (
                              <div className="flex items-center gap-2 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                <audio 
                                  autoPlay 
                                  src={report.voice_url} 
                                  onEnded={() => setActiveAudio(null)}
                                  className="h-6 w-32"
                                  controls
                                />
                                <button 
                                  onClick={() => setActiveAudio(null)}
                                  className="text-rose-400 hover:text-rose-300"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setActiveAudio(report.id)}
                                className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title={lang === 'am' ? 'ድምፅ አጫውት' : 'Play Voice Note'}
                              >
                                <Volume2 size={18} />
                              </button>
                            )}
                          </div>
                        )}
                        {(report.documents || []).length > 0 ? (
                          <div className="flex items-center gap-1">
                            {report.documents?.map((doc, idx) => (
                              <a 
                                key={idx}
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                                title={doc.name}
                              >
                                <FileText size={18} />
                              </a>
                            ))}
                          </div>
                        ) : report.document_url ? (
                          <a 
                            href={report.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                            title={lang === 'am' ? 'ሰነድ እይ' : 'View Document'}
                          >
                            <FileText size={18} />
                          </a>
                        ) : null}
                        <button 
                          onClick={() => handleEdit(report)}
                          className="p-2 text-brand-text-secondary hover:text-brand-accent transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => onDelete(report.id)}
                          className="p-2 text-brand-text-secondary hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                        <button 
                          id={`download-report-${report.id}`}
                          onClick={() => exportSingleReportPDF(report, officers, lang)}
                          className="p-2 text-brand-text-secondary hover:text-brand-accent transition-colors"
                          title={lang === 'am' ? 'ይህንን ሪፖርት በPDF አውርድ' : 'Download this report as PDF'}
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Export to PDF Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="glass-card w-full max-w-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto border border-brand-border/80 shadow-2xl rounded-2xl"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-brand-border">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-brand-accent/15 text-brand-accent rounded-xl border border-brand-accent/25">
                    <FileDown size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-brand-text">
                        {lang === 'am' ? 'የክስተቶችና የተግባራት ማጠቃለያ PDF ማውረጃ' : 'Official Summary PDF Export'}
                      </h2>
                      <span className="text-[10px] bg-brand-accent/20 text-brand-accent font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {lang === 'am' ? 'ኦፊሴላዊ መዝገብ' : 'Official Record'}
                      </span>
                    </div>
                    <p className="text-xs text-brand-text-secondary mt-0.5">
                      {lang === 'am' 
                        ? 'ለአስተዳደር ስራ እና ለመዛግብት ክምችት የተሟላ የክስተቶችና የተግባራት ማጠቃለያ ሰነድ' 
                        : 'Download official incident and assignment summaries for administrative records.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExportModalOpen(false)} 
                  className="p-2 hover:bg-brand-bg rounded-full text-brand-text-secondary hover:text-brand-text transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Admin Attestation Notice */}
              <div className="mb-6 p-3 bg-brand-bg/60 border border-brand-border rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-brand-text-secondary">
                  <Shield size={16} className="text-brand-accent shrink-0" />
                  <span>
                    <strong className="text-brand-text">{lang === 'am' ? 'ፈቃድ የተሰጠው አስተዳዳሪ:' : 'Authorized Administrator:'}</strong>{' '}
                    {user?.name || 'Chief Administrator'} ({user?.role || 'Admin'})
                  </span>
                </div>
                <span className="text-[11px] text-brand-text-secondary font-medium">
                  {lang === 'am' ? 'ምዕራብ ጎጃም ዞን ፖሊስ መምሪያ' : 'West Gojjam Police Dept'}
                </span>
              </div>

              {exportSuccessMessage ? (
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center my-6">
                  <CheckCircle size={40} className="text-emerald-400 mx-auto mb-2 animate-bounce" />
                  <h4 className="text-lg font-bold text-emerald-400 mb-1">
                    {lang === 'am' ? 'ሰነዱ በተሳካ ሁኔታ ተዘጋጅቷል!' : 'PDF Generated Successfully!'}
                  </h4>
                  <p className="text-xs text-brand-text-secondary">
                    {exportSuccessMessage}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Scope Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-2">
                      {lang === 'am' ? 'የሪፖርቱ ይዘት ምረጥ' : 'Select Summary Content Scope'}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        id="export-scope-reports"
                        onClick={() => setPdfSummaryType('reports')}
                        className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                          pdfSummaryType === 'reports'
                            ? 'bg-brand-accent/15 border-brand-accent text-brand-text shadow-sm ring-1 ring-brand-accent/50'
                            : 'bg-brand-bg/40 border-brand-border text-brand-text-secondary hover:border-brand-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-brand-text flex items-center gap-1.5">
                            <FileText size={15} className="text-brand-accent" />
                            {lang === 'am' ? 'የተጣሩ ሪፖርቶች መዝገብ' : 'Filtered Reports Archive'}
                          </span>
                          {pdfSummaryType === 'reports' && <Check size={14} className="text-brand-accent font-bold" />}
                        </div>
                        <p className="text-[11px] opacity-80 leading-snug">
                          {lang === 'am' 
                            ? 'በአሁኑ ፍለጋና ማጣሪያ መሰረት የተመረጡ የክስተት ሪፖርቶች' 
                            : 'Incident reports matching active search, date & officer filters'}
                        </p>
                        <div className="mt-2.5 flex items-center gap-2">
                          <span className="text-[11px] font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded-md border border-brand-accent/20">
                            {filteredReports.length} {lang === 'am' ? 'ሪፖርቶች' : 'matching reports'}
                          </span>
                          {activeFilterCount > 0 && (
                            <span className="text-[10px] text-amber-400 font-medium">
                              ({activeFilterCount} {lang === 'am' ? 'ማጣሪያዎች ነቁ' : 'filters active'})
                            </span>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        id="export-scope-all"
                        onClick={() => setPdfSummaryType('all')}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          pdfSummaryType === 'all'
                            ? 'bg-brand-accent/15 border-brand-accent text-brand-text shadow-sm ring-1 ring-brand-accent/50'
                            : 'bg-brand-bg/40 border-brand-border text-brand-text-secondary hover:border-brand-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-brand-text flex items-center gap-1.5">
                            <Layers size={15} className="text-brand-accent" />
                            {lang === 'am' ? 'ሙሉ ማጠቃለያ (Executive)' : 'Full Executive Summary'}
                          </span>
                          {pdfSummaryType === 'all' && <Check size={14} className="text-brand-accent font-bold" />}
                        </div>
                        <p className="text-[11px] opacity-80 leading-snug">
                          {lang === 'am' ? 'ክስተቶች + የስራ ምደባዎች ሙሉ ማጠቃለያ' : 'Comprehensive incidents and field assignments record'}
                        </p>
                        <div className="mt-2.5 text-[10px] font-semibold text-brand-accent">
                          {incidents.length} {lang === 'am' ? 'ክስተቶች' : 'cases'} | {assignments.length} {lang === 'am' ? 'ተግባራት' : 'tasks'}
                        </div>
                      </button>

                      <button
                        type="button"
                        id="export-scope-incidents"
                        onClick={() => setPdfSummaryType('incidents')}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          pdfSummaryType === 'incidents'
                            ? 'bg-brand-accent/15 border-brand-accent text-brand-text shadow-sm ring-1 ring-brand-accent/50'
                            : 'bg-brand-bg/40 border-brand-border text-brand-text-secondary hover:border-brand-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-brand-text flex items-center gap-1.5">
                            <Shield size={15} className="text-brand-accent" />
                            {lang === 'am' ? 'የክስተቶች ማጠቃለያ' : 'Incidents Only'}
                          </span>
                          {pdfSummaryType === 'incidents' && <Check size={14} className="text-brand-accent font-bold" />}
                        </div>
                        <p className="text-[11px] opacity-80 leading-snug">
                          {lang === 'am' ? 'የወንጀልና ትራፊክ ክስተቶች መዝገብ' : 'Crime and traffic case investigations'}
                        </p>
                        <div className="mt-2.5 text-[10px] font-semibold text-brand-accent">
                          {incidents.length} {lang === 'am' ? 'የተመዘገቡ ክስተቶች' : 'total incidents'}
                        </div>
                      </button>

                      <button
                        type="button"
                        id="export-scope-assignments"
                        onClick={() => setPdfSummaryType('assignments')}
                        className={`p-3.5 rounded-xl border text-left transition-all ${
                          pdfSummaryType === 'assignments'
                            ? 'bg-brand-accent/15 border-brand-accent text-brand-text shadow-sm ring-1 ring-brand-accent/50'
                            : 'bg-brand-bg/40 border-brand-border text-brand-text-secondary hover:border-brand-border/80'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-brand-text flex items-center gap-1.5">
                            <FileCheck size={15} className="text-brand-accent" />
                            {lang === 'am' ? 'የስራ ምደባዎች' : 'Assignments Only'}
                          </span>
                          {pdfSummaryType === 'assignments' && <Check size={14} className="text-brand-accent font-bold" />}
                        </div>
                        <p className="text-[11px] opacity-80 leading-snug">
                          {lang === 'am' ? 'የኦፊሰሮች ስምሪትና ተልዕኮ ዝርዝር' : 'Tactical officer task assignments and statuses'}
                        </p>
                        <div className="mt-2.5 text-[10px] font-semibold text-brand-accent">
                          {assignments.length} {lang === 'am' ? 'የተሰጡ ምደባዎች' : 'active assignments'}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Active Filter Criteria Preview Notice */}
                  {activeFilterCount > 0 && (
                    <div className="p-3 bg-brand-accent/10 border border-brand-accent/25 rounded-xl text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-brand-accent">
                        <span className="flex items-center gap-1.5">
                          <Filter size={13} />
                          {lang === 'am' ? 'የነቁ ማጣሪያዎች ተካትተዋል:' : 'Active Filter Criteria Included in PDF:'}
                        </span>
                        <span className="text-[10px] bg-brand-accent/20 px-2 py-0.5 rounded-full">
                          {activeFilterCount} {lang === 'am' ? 'ማጣሪያዎች' : 'Active'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-brand-text">
                        {filterIncidentType !== 'all' && (
                          <span className="bg-brand-bg/80 px-2 py-0.5 rounded border border-brand-border">
                            Type: <strong>{filterIncidentType}</strong>
                          </span>
                        )}
                        {filterOfficerId !== 'all' && (
                          <span className="bg-brand-bg/80 px-2 py-0.5 rounded border border-brand-border">
                            Officer: <strong>{officers.find(o => o.id === filterOfficerId)?.name || 'Selected Officer'}</strong>
                          </span>
                        )}
                        {filterDatePreset !== 'all' && (
                          <span className="bg-brand-bg/80 px-2 py-0.5 rounded border border-brand-border">
                            Date: <strong>{filterDatePreset === 'custom' ? `${filterStartDate || 'Start'} to ${filterEndDate || 'Now'}` : filterDatePreset}</strong>
                          </span>
                        )}
                        {filterStatus !== 'all' && (
                          <span className="bg-brand-bg/80 px-2 py-0.5 rounded border border-brand-border">
                            Status: <strong>{filterStatus}</strong>
                          </span>
                        )}
                        {searchTerm.trim() && (
                          <span className="bg-brand-bg/80 px-2 py-0.5 rounded border border-brand-border">
                            Search: <strong>"{searchTerm}"</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Filter controls: Date, Officer & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-1.5">
                        {lang === 'am' ? 'የጊዜ ክልል' : 'Date Range'}
                      </label>
                      <select
                        value={filterDatePreset !== 'all' ? filterDatePreset : pdfDateFilter}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setPdfDateFilter(val);
                          setFilterDatePreset(val);
                        }}
                        className="input-field text-xs py-2"
                      >
                        <option value="all">{lang === 'am' ? 'ሁሉንም መዛግብት (All Records)' : 'All Records on File'}</option>
                        <option value="today">{lang === 'am' ? 'ዛሬ (Today)' : 'Today'}</option>
                        <option value="7days">{lang === 'am' ? 'ያለፉት 7 ቀናት (Past 7 Days)' : 'Past 7 Days'}</option>
                        <option value="30days">{lang === 'am' ? 'ያለፉት 30 ቀናት (Past 30 Days)' : 'Past 30 Days'}</option>
                        <option value="year">{lang === 'am' ? 'የዚህ ዓመት (Current Year)' : 'Current Calendar Year'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-1.5">
                        {lang === 'am' ? 'ኦፊሰር' : 'Officer in Charge'}
                      </label>
                      <select
                        value={filterOfficerId}
                        onChange={(e) => setFilterOfficerId(e.target.value)}
                        className="input-field text-xs py-2"
                      >
                        <option value="all">{lang === 'am' ? 'ሁሉም ኦፊሰሮች (All Officers)' : 'All Officers'}</option>
                        {officers.map((officer) => (
                          <option key={officer.id} value={officer.id}>
                            {officer.name} ({(t.ranks as any)[officer.rank] || officer.rank})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-brand-text-secondary uppercase tracking-wider mb-1.5">
                        {lang === 'am' ? 'የሁኔታ ማጣሪያ' : 'Status Filter'}
                      </label>
                      <select
                        value={filterStatus !== 'all' ? filterStatus : pdfStatusFilter}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setPdfStatusFilter(val);
                          setFilterStatus(val);
                        }}
                        className="input-field text-xs py-2"
                      >
                        <option value="all">{lang === 'am' ? 'ሁሉም ሁኔታዎች (All Statuses)' : 'All Statuses'}</option>
                        <option value="active">{lang === 'am' ? 'በሂደት ላይ / ክፍት (Pending / Open)' : 'Pending / Open'}</option>
                        <option value="closed">{lang === 'am' ? 'የተዘጉ / የተጠናቀቁ (Submitted / Closed)' : 'Submitted / Closed'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Document Inclusions */}
                  <div className="bg-brand-bg/40 p-4 rounded-xl border border-brand-border space-y-3">
                    <span className="block text-xs font-semibold text-brand-text-secondary uppercase tracking-wider">
                      {lang === 'am' ? 'የሰነድ ማረጋገጫና ክፍሎች' : 'Official Document Sections'}
                    </span>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={pdfIncludeStats}
                        onChange={(e) => setPdfIncludeStats(e.target.checked)}
                        className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent bg-brand-bg"
                      />
                      <span className="text-xs text-brand-text">
                        {lang === 'am' ? 'የስታቲስቲክስ እና የKPI ማጠቃለያ ካርዶች ይካተቱ' : 'Include Statistical KPI Analytics Cards'}
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={pdfIncludeSignatures}
                        onChange={(e) => setPdfIncludeSignatures(e.target.checked)}
                        className="w-4 h-4 rounded border-brand-border text-brand-accent focus:ring-brand-accent bg-brand-bg"
                      />
                      <span className="text-xs text-brand-text">
                        {lang === 'am' ? 'የክፍሉ አዛዥ ፊርማና የፖሊስ ማህተም ሳጥን ይካተት' : 'Include Official Commander Signature Block & Department Seal'}
                      </span>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => setIsExportModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-brand-border text-brand-text-secondary hover:text-brand-text hover:bg-brand-bg transition-colors text-sm font-medium"
                    >
                      {lang === 'am' ? 'ተመለስ' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      id="confirm-generate-pdf-btn"
                      onClick={handleExportPDF}
                      disabled={isExportingPDF}
                      className="btn-primary flex items-center gap-2 px-5 py-2.5 shadow-md"
                    >
                      {isExportingPDF ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>{lang === 'am' ? 'በማዘጋጀት ላይ...' : 'Generating Official PDF...'}</span>
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          <span>{lang === 'am' ? 'PDF አውርድ' : 'Download Official PDF'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card w-full max-w-3xl p-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">{editingReport ? t.editReport : t.newReport}</h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-brand-bg rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-4 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    currentStep === s 
                      ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' 
                      : currentStep > s 
                        ? 'bg-emerald-500 text-white'
                        : 'bg-brand-bg text-brand-text-secondary border border-brand-border'
                  }`}>
                    {currentStep > s ? <CheckCircle size={16} /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 ${currentStep > s ? 'bg-emerald-500' : 'bg-brand-border'}`} />}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderStep()}
                </motion.div>
              </AnimatePresence>

              <div className="flex gap-4 pt-4 border-t border-brand-border">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="btn-secondary flex-1 flex items-center justify-center gap-2"
                  >
                    <ChevronLeft size={18} />
                    {t.back}
                  </button>
                )}

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1) {
                        if (!newReport.title.trim()) {
                          setErrorMessage(lang === 'am' ? 'እባክዎ የሪፖርቱን አርዕስት በትክክለኛ ሁኔታ ያስገቡ' : 'Please enter a valid report title');
                          return;
                        }
                      }
                      if (currentStep === 2) {
                        if (!newReport.filingStation || !newReport.officerId) {
                          setErrorMessage(lang === 'am' ? 'እባክዎ ጣቢያ እና መዝጋቢ መኮንን መምረጥዎን ያረጋግጡ' : 'Please make sure to select a station and recording officer');
                          return;
                        }
                      }
                      setErrorMessage(null);
                      setCurrentStep(prev => prev + 1);
                    }}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {t.next}
                    <ChevronRight size={18} />
                  </button>
                ) : (
                  <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={isSubmitting}>
                    <Send size={18} />
                    {isSubmitting ? (lang === 'am' ? 'በመላክ ላይ...' : 'Submitting...') : (editingReport ? t.saveProfile : t.submitReport)}
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
