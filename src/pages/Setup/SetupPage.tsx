import { useState } from 'react';
import { Heart, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

interface SetupPageProps {
  onComplete: () => void;
}

const steps = [
  { title: 'Hospital Information', description: 'Enter basic hospital details' },
  { title: 'Contact Details', description: 'Phone, email and address' },
  { title: 'Create Admin Account', description: 'Setup administrator credentials' },
  { title: 'Complete Setup', description: 'Finalizing configuration' },
];

const schema = z.object({
  hospitalName: z.string().min(2, 'Hospital name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  adminFullName: z.string().min(2, 'Full name is required'),
  adminUsername: z.string().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscore'),
  adminPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.adminPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function SetupPage({ onComplete }: SetupPageProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const stepFields: Record<number, (keyof FormData)[]> = {
    0: ['hospitalName'],
    1: ['address', 'phone', 'email'],
    2: ['adminFullName', 'adminUsername', 'adminPassword', 'confirmPassword'],
  };

  const handleNext = async () => {
    const fields = stepFields[currentStep];
    if (fields) {
      const valid = await trigger(fields);
      if (!valid) return;
    }
    setCurrentStep(prev => prev + 1);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await window.api.auth.setupAdmin({
        hospitalName: data.hospitalName,
        address: data.address || '',
        phone: data.phone || '',
        username: data.adminUsername,
        password: data.adminPassword,
        fullName: data.adminFullName,
      });

      if (result.success) {
        toast.success('Setup completed successfully!');
        onComplete();
      } else {
        toast.error(result.error || 'Setup failed');
      }
    } catch {
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="glass-card p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">First Time Setup</h1>
            <p className="text-slate-400 text-sm mt-1">Configure your hospital billing system</p>
          </div>

          {/* Progress */}
          <div className="flex items-center mb-8">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 transition-colors ${
                  idx < currentStep ? 'bg-emerald-600 text-white' :
                  idx === currentStep ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-500'
                }`}>
                  {idx < currentStep ? <Check size={14} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-colors ${idx < currentStep ? 'bg-emerald-600' : 'bg-slate-700'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="mb-2">
            <h2 className="text-lg font-semibold text-white">{steps[currentStep].title}</h2>
            <p className="text-sm text-slate-400">{steps[currentStep].description}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
            {/* Step 0: Hospital Info */}
            {currentStep === 0 && (
              <div className="form-group">
                <label className="form-label">Hospital Name *</label>
                <input {...register('hospitalName')} className="form-input" placeholder="e.g. City General Hospital" autoFocus />
                {errors.hospitalName && <p className="form-error">{errors.hospitalName.message}</p>}
              </div>
            )}

            {/* Step 1: Contact */}
            {currentStep === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea {...register('address')} className="form-input" rows={3} placeholder="Hospital address" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input {...register('phone')} className="form-input" placeholder="+91 XXXXX XXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input {...register('email')} type="email" className="form-input" placeholder="hospital@example.com" />
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>
              </>
            )}

            {/* Step 2: Admin Account */}
            {currentStep === 2 && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input {...register('adminFullName')} className="form-input" placeholder="Administrator Name" autoFocus />
                  {errors.adminFullName && <p className="form-error">{errors.adminFullName.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Username *</label>
                  <input {...register('adminUsername')} className="form-input" placeholder="admin" />
                  {errors.adminUsername && <p className="form-error">{errors.adminUsername.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Password *</label>
                  <input {...register('adminPassword')} type="password" className="form-input" placeholder="Min 6 characters" />
                  {errors.adminPassword && <p className="form-error">{errors.adminPassword.message}</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm Password *</label>
                  <input {...register('confirmPassword')} type="password" className="form-input" placeholder="Repeat password" />
                  {errors.confirmPassword && <p className="form-error">{errors.confirmPassword.message}</p>}
                </div>
              </>
            )}

            {/* Step 3: Finalize */}
            {currentStep === 3 && (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-emerald-400" />
                </div>
                <p className="text-slate-300 mb-2">Everything looks good!</p>
                <p className="text-slate-500 text-sm">Click Finish Setup to initialize the database and create your admin account.</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 0}
                className="btn-secondary"
              >
                <ChevronLeft size={16} /> Back
              </button>

              {currentStep < steps.length - 1 ? (
                <button type="button" onClick={handleNext} className="btn-primary">
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button type="submit" className="btn-success" disabled={isSubmitting}>
                  {isSubmitting ? 'Setting up...' : 'Finish Setup'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
