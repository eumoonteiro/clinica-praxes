import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  updateDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, ClipboardList, AlertCircle, CheckCircle2, ArrowLeft, Activity } from 'lucide-react';

const Login = () => {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && userData) {
      const routes: Record<string, string> = {
        'coordenacao': '/coordenacao',
        'supervisor': '/supervisor',
        'analista': '/analista'
      };
      navigate(routes[userData.role] || '/analista');
    }
  }, [user, userData, navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccess('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      setTimeout(() => setResetMode(false), 5000);
    } catch (err: any) {
      setError('E-mail não encontrado ou erro no sistema.');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      if (isRegistering) {
        const q = query(collection(db, 'usuarios_autorizados'), where('cpf', '==', cpf));
        const snap = await getDocs(q);
        if (snap.empty) throw new Error('CPF não autorizado pela coordenação.');

        const authorizedData = snap.docs[0].data();
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const newUser = userCredential.user;

        await updateProfile(newUser, { displayName: authorizedData.name });
        await setDoc(doc(db, 'usuarios_clinica', newUser.uid), {
          uid: newUser.uid,
          name: authorizedData.name,
          email: email.trim(),
          cpf,
          role: authorizedData.role || 'analista',
          createdAt: new Date()
        });

        // Link patients previously assigned via CPF
        const qPatients = query(collection(db, 'pacientes'), where('analistaCpf', '==', cpf));
        const patientsSnap = await getDocs(qPatients);
        const updates = patientsSnap.docs.map(pDoc => 
          updateDoc(doc(db, 'pacientes', pDoc.id), {
            analistaUid: newUser.uid,
            analistaCpf: ''
          })
        );
        await Promise.all(updates);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (err: any) {
      console.error(err);
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'Este e-mail já está em uso. Tente fazer login.',
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
        'auth/user-not-found': 'Usuário não encontrado.'
      };
      setError(messages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '14px 18px 14px 45px',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top right, #f8fafc, #e2e8f0)', padding: '20px' }}>
      <style>{`
        .login-input:focus { border-color: #6366f1 !important; background: white !important; box-shadow: 0 0 0 4px rgba(99,102,241,0.1); }
        .btn-primary { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; border: none; padding: 14px; borderRadius: 16px; fontWeight: 600; cursor: pointer; transition: all 0.3s; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2); }
        .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '460px', padding: '50px', borderRadius: '32px', background: 'white', border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '35px' }}>
          <div style={{ width: '70px', height: '70px', background: '#6366f1', borderRadius: '20px', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 15px 30px rgba(99,102,241,0.2)' }}>
            <Activity size={35} color="white" />
          </div>
          <h2 className="outfit" style={{ fontSize: '2rem', color: '#1e293b', marginBottom: '8px' }}>Práxis Clínica</h2>
          <p style={{ color: '#64748b' }}>{resetMode ? 'Recuperar acesso' : isRegistering ? 'Criar nova conta' : 'Acesse seu painel'}</p>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#fee2e2', color: '#ef4444', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <AlertCircle size={18} /> {error}
              </div>
            </motion.div>
          )}
          {success && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ marginBottom: '20px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#dcfce7', color: '#16a34a', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={18} /> {success}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={resetMode ? handleResetPassword : handleAuth}>
          {isRegistering && (
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px', display: 'block' }}>CPF (Somente números)</label>
              <div style={{ position: 'relative' }}>
                <input className="login-input" style={inputStyle} value={cpf} onChange={e => setCpf(e.target.value.replace(/\D/g, ''))} placeholder="00000000000" required />
                <ClipboardList size={18} style={{ position: 'absolute', left: '15px', top: '14px', color: '#94a3b8' }} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px', display: 'block' }}>E-mail</label>
            <div style={{ position: 'relative' }}>
              <input type="email" className="login-input" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
              <Mail size={18} style={{ position: 'absolute', left: '15px', top: '14px', color: '#94a3b8' }} />
            </div>
          </div>

          {!resetMode && (
            <div className="form-group" style={{ marginBottom: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', color: '#475569' }}>Senha</label>
                {!isRegistering && (
                  <span style={{ fontSize: '0.8rem', color: '#4f46e5', cursor: 'pointer', fontWeight: 600 }} onClick={() => setResetMode(true)}>Esqueceu?</span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input type="password" className="login-input" style={inputStyle} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                <Lock size={18} style={{ position: 'absolute', left: '15px', top: '14px', color: '#94a3b8' }} />
              </div>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
            {loading ? 'Processando...' : resetMode ? 'Enviar Link de Recuperação' : isRegistering ? 'Criar minha conta' : 'Entrar no sistema'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '25px', fontSize: '0.9rem', color: '#64748b' }}>
          {resetMode ? (
            <p style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }} onClick={() => setResetMode(false)}>
              <ArrowLeft size={16} /> Voltar para o login
            </p>
          ) : isRegistering ? (
            <p>Já possui uma conta? <span style={{ color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }} onClick={() => setIsRegistering(false)}>Fazer Login</span></p>
          ) : (
            <p>Primeiro acesso? <span style={{ color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }} onClick={() => setIsRegistering(true)}>Cadastrar com CPF</span></p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
