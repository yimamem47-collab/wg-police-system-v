const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.reportType}</label>
              <select 
                className="input-field"
                value={newReport.type}
                onChange={(e) => setNewReport({...newReport, type: e.target.value})}
              >
                <option value="">{t.selectType}</option>
                {reportTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.titleLabel}</label>
              <input 
                type="text"
                className="input-field"
                placeholder={t.titlePlaceholder}
                value={newReport.title}
                onChange={(e) => setNewReport({...newReport, title: e.target.value})}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.locationLabel}</label>
              <input 
                type="text"
                className="input-field"
                placeholder={t.locationPlaceholder}
                value={newReport.location}
                onChange={(e) => setNewReport({...newReport, location: e.target.value})}
              />
            </div>

            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.dateLabel}</label>
              <input 
                type="date"
                className="input-field"
                value={newReport.date}
                onChange={(e) => setNewReport({...newReport, date: e.target.value})}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            {/* ዝርዝር መግለጫ መስጫ */}
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">{t.detailedDescription}</label>
              <textarea 
                className="input-field min-h-[100px]"
                placeholder={t.descriptionPlaceholder}
                value={newReport.description}
                onChange={(e) => setNewReport({...newReport, description: e.target.value})}
              />
            </div>

            {/* ፎቶዎች ማያያዣ ክፍል */}
            <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border shadow-sm">
              <label className="block text-sm font-medium text-brand-text-secondary mb-3">{t.attachFiles || 'ፎቶዎች እና ሰነዶች አያይዝ'}</label>
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
                
                {/* የፎቶ ቁጥር ከ 10 በታች ከሆነ ተጨማሪ ማካተቻ ቁልፍ ያሳያል */}
                {(newReport.photos || []).length < 10 && (
                  <button 
                    type="button"
                    onClick={handlePhotoUpload}
                    className="aspect-square rounded-xl border-2 border-dashed border-brand-border flex flex-col items-center justify-center gap-2 hover:border-brand-accent hover:bg-brand-accent/5 transition-all cursor-pointer"
                  >
                    <Camera size={24} className="text-brand-text-secondary" />
                    <span className="text-[10px] uppercase font-bold text-brand-text-secondary">ፎቶ</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };
