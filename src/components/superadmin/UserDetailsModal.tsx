import { X, User, Phone, Mail, Building, CreditCard, Calendar, Hash, Shield, FileText } from 'lucide-react'
import { User as UserType } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { format } from 'date-fns'

interface UserDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    user: UserType | null
}

export function UserDetailsModal({ isOpen, onClose, user }: UserDetailsModalProps) {
    if (!isOpen || !user) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl scale-100 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                            {user.fullName}
                            <Badge variant={user.status === 'Active' ? 'success' : 'error'} className="text-[10px] uppercase">
                                {user.status}
                            </Badge>
                        </h2>
                        <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-2">
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-xs font-bold font-mono">#{user.userId}</span>
                            <span>•</span>
                            <span>Joined {format(new Date(user.createdAt), 'MMMM d, yyyy')}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-8">
                    {/* Basic Info */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest">
                            <User size={14} className="text-blue-500" />
                            <h3>Personal Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Mobile Number</label>
                                <div className="flex items-center gap-2 font-bold text-gray-900">
                                    <Phone size={14} className="text-gray-400" />
                                    {user.mobileNumber}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Email Address</label>
                                <div className="flex items-center gap-2 font-bold text-gray-900 break-all">
                                    <Mail size={14} className="text-gray-400" />
                                    {user.email || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">User Role</label>
                                <div className="flex items-center gap-2 font-bold text-gray-900">
                                    <Shield size={14} className="text-gray-400" />
                                    {user.role}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Employee ID</label>
                                <div className="flex items-center gap-2 font-bold text-gray-900 font-mono">
                                    <Hash size={14} className="text-gray-400" />
                                    {user.empId || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Assigned Campus</label>
                                <div className="flex items-center gap-2 font-bold text-gray-900">
                                    <Building size={14} className="text-gray-400" />
                                    {user.assignedCampus || 'Global / Not assigned'}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Child / Student Linkage */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest">
                            <User size={14} className="text-purple-500" />
                            <h3>Student Linkage</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                <label className="text-[10px] font-bold text-purple-400 uppercase block mb-1">Child's Name</label>
                                <div className="font-bold text-gray-900">
                                    {user.childName || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                <label className="text-[10px] font-bold text-purple-400 uppercase block mb-1">Child's Grade</label>
                                <div className="font-bold text-gray-900">
                                    {user.grade || 'N/A'}
                                </div>
                            </div>
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 col-span-2">
                                <label className="text-[10px] font-bold text-purple-400 uppercase block mb-1">Child ERP Number</label>
                                <div className="font-bold text-gray-900 font-mono">
                                    {user.childEprNo || 'Not Linked'}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Financial Details */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-black text-gray-400 uppercase tracking-widest">
                            <CreditCard size={14} className="text-emerald-500" />
                            <h3>Financial & Payment Details</h3>
                        </div>
                        <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-bold text-emerald-600/70 uppercase block mb-1">Registration Payment Status</label>
                                <Badge variant={user.paymentStatus === 'Completed' ? 'success' : 'warning'} className="text-xs uppercase">
                                    {user.paymentStatus || 'Pending'}
                                </Badge>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-emerald-600/70 uppercase block mb-1">Transaction ID</label>
                                <div className="font-mono font-bold text-gray-900 break-all">
                                    {user.transactionId || 'N/A'}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-emerald-600/70 uppercase block mb-1">Payment Amount</label>
                                <div className="font-black text-xl text-gray-900">
                                    ₹{(user.paymentAmount || 0).toLocaleString('en-IN')}
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-emerald-600/70 uppercase block mb-1">Aadhar Number (Encrypted)</label>
                                <div className="font-mono text-sm text-gray-500 break-all">
                                    {user.aadharNo ? '•••• •••• ' + user.aadharNo.slice(-4) : 'Not Provided'}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-emerald-600/70 uppercase block mb-1">Bank Account Details (Encrypted)</label>
                                <div className="bg-white/50 p-3 rounded-xl border border-emerald-100/50 text-sm font-mono text-gray-600">
                                    {user.bankAccountDetails || 'No bank details provided'}
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-6 z-10">
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
