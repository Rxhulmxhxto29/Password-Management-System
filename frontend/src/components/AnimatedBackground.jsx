import { Key, Shield, Lock, Fingerprint } from 'lucide-react';

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 flex items-center justify-center">
      {/* Background ambient lighting blobs */}
      <div className="absolute top-[10%] left-[15%] w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>

      {/* Floating Elements layer */}
      <div className="absolute inset-0 w-full h-full">
        {/* Top left floating key */}
        <div className="absolute top-[15%] left-[20%] opacity-[0.15] text-primary-400 animate-float">
          <Key size={64} className="transform rotate-45" />
        </div>
        
        {/* Top right floating shield */}
        <div className="absolute top-[25%] right-[25%] opacity-[0.12] text-indigo-400 animate-float" style={{ animationDelay: '3s', animationDuration: '18s' }}>
          <Shield size={80} />
        </div>

        {/* Bottom left lock */}
        <div className="absolute bottom-[20%] left-[30%] opacity-[0.1] text-gray-500 animate-float" style={{ animationDelay: '5s', animationDuration: '22s' }}>
          <Lock size={72} className="transform -rotate-12" />
        </div>

        {/* Bottom right fingerprint */}
        <div className="absolute bottom-[30%] right-[15%] opacity-[0.15] text-primary-500 animate-float" style={{ animationDelay: '1s', animationDuration: '16s' }}>
          <Fingerprint size={96} className="transform rotate-12" />
        </div>

        {/* Extra small keys drifting */}
        <div className="absolute top-[60%] left-[10%] opacity-[0.08] text-white animate-float" style={{ animationDelay: '8s', animationDuration: '25s' }}>
          <Key size={40} className="transform -rotate-45" />
        </div>
        <div className="absolute top-[10%] right-[40%] opacity-[0.08] text-primary-300 animate-float" style={{ animationDelay: '12s', animationDuration: '20s' }}>
          <Key size={48} className="transform -rotate-90" />
        </div>
        <div className="absolute bottom-[5%] right-[45%] opacity-[0.05] text-white animate-float" style={{ animationDelay: '6s', animationDuration: '30s' }}>
          <Shield size={56} className="transform rotate-180" />
        </div>
      </div>
    </div>
  );
};

export default AnimatedBackground;
