import { Mail, Phone, MapPin, Building2, Globe } from 'lucide-react'

export default function ContactPage() {
    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-4">
                    <Building2 size={12} />
                    Get in Touch
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4">Contact Us</h1>
                <p className="text-lg text-white/60">We're here to help you</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Address Card */}
                <div className="col-span-1 md:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                            <MapPin size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Registered Office</h3>
                            <p className="text-white/60 leading-relaxed font-medium">
                                ACHARIYA WORLD CLASS EDUCATION<br />
                                No. 5, Achariya Campus,<br />
                                Villianur, Puducherry - 605 110.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Phone Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                            <Phone size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Phone Support</h3>
                            <p className="text-white/60 mb-1">General Inquiries:</p>
                            <a href="tel:+919442255279" className="text-xl font-bold text-white hover:text-emerald-400 transition-colors block mb-4">
                                +91-94422 55279
                            </a>
                            <p className="text-xs text-white/40 uppercase tracking-wider">Mon - Sat, 9:00 AM - 6:00 PM</p>
                        </div>
                    </div>
                </div>

                {/* Email Card */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-purple-500/20 rounded-2xl text-purple-400">
                            <Mail size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white mb-2">Email Us</h3>
                            <p className="text-white/60 mb-1">Support & Queries:</p>
                            <a href="mailto:5star@achariya.org" className="text-xl font-bold text-white hover:text-purple-400 transition-colors block mb-4">
                                5star@achariya.org
                            </a>
                            <p className="text-xs text-white/40 uppercase tracking-wider">Response within 24 hours</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 text-center">
                <a href="https://achariya.in" target="_blank" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-medium">
                    <Globe size={14} />
                    Visit our main website at achariya.in
                </a>
            </div>
        </div>
    )
}
