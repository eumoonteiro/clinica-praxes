import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  Users, 
  History,
  MessageCircle,
  Activity
} from 'lucide-react';

const SupervisorDashboard = () => {
  const { userData } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [prontuarios, setProntuarios] = useState<any[]>([]);

  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [analysts, setAnalysts] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Analysts to see who I supervise
    const unsubAnalysts = onSnapshot(collection(db, 'usuarios_clinica'), (snapshot) => {
      const allAnalysts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnalysts(allAnalysts);
      const myAnalysts = allAnalysts.filter((a: any) => a.supervisor === userData?.name);
      const myAnalystUids = myAnalysts.map((a: any) => a.uid);
      
      // 2. Fetch Patients and filter
      const unsubPatients = onSnapshot(collection(db, 'pacientes'), (pSnapshot) => {
        const allPatients = pSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const filteredPatients = userData?.role === 'supervisor' 
          ? allPatients.filter((p: any) => myAnalystUids.includes(p.analistaUid))
          : allPatients;
        setPatients(filteredPatients);
      });

      return () => unsubPatients();
    });

    const unsubPayments = onSnapshot(collection(db, 'pagamentos'), (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProntuarios = onSnapshot(collection(db, 'prontuarios'), (snapshot) => {
      setProntuarios(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAnalysts();
      unsubPayments();
      unsubProntuarios();
    };
  }, [userData]);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 className="outfit">Painel do Supervisor</h1>
            <p style={{ color: 'var(--text-muted)' }}>Supervisão Clínica • {userData?.name}</p>
          </div>
          <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => auth.signOut()}>
            Sair <LogOut size={18} />
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', padding: '15px', borderRadius: '15px' }}><Users size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Pacientes</span>
              <h3 className="outfit">{patients.length}</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', padding: '15px', borderRadius: '15px' }}><Activity size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Prontuários Registrados</span>
              <h3 className="outfit">{prontuarios.length}</h3>
            </div>
          </div>
        </div>

        {/* List of Patients and their Evolutions */}
        <div className="card">
          <h4 className="outfit" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}><History size={20}/> Evolução Clínica dos Casos</h4>
          <div style={{ display: 'grid', gap: '20px' }}>
            {patients.map(p => {
              const patientProntuarios = prontuarios.filter(pr => pr.patientId === p.id).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
              const patientPayments = payments.filter(pay => pay.patientId === p.id);
              const analista = analysts.find(a => a.uid === p.analistaUid);
              
              return (
                <div key={p.id} className="glass" style={{ padding: '20px', borderRadius: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div>
                      <h5 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary)' }}>{p.name}</h5>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0' }}>Analista: <strong>{analista?.name || 'Carregando...'}</strong></p>
                      <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: '#f1f5f9', color: 'var(--text-main)', marginTop: '8px', display: 'inline-block' }}>
                        Periodicidade: {p.evolucaoFrequencia || 'Não definida'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                       {p.phone && (
                          <a href={`https://wa.me/55${p.phone}`} target="_blank" className="btn" style={{ background: '#25d366', color: 'white', padding: '8px' }}>
                            <MessageCircle size={16}/>
                          </a>
                        )}
                        <button 
                          className="btn" 
                          style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', fontSize: '0.8rem', padding: '6px 15px' }}
                          onClick={() => setExpandedPatientId(expandedPatientId === p.id ? null : p.id)}
                        >
                          {expandedPatientId === p.id ? 'Fechar' : 'Ver Detalhes'}
                        </button>
                    </div>
                  </div>

                  {expandedPatientId === p.id && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{ borderTop: '1px solid #f1f5f9', marginTop: '15px', paddingTop: '20px' }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }} className="mobile-grid">
                        {/* Evolution History */}
                        <div>
                          <h6 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '15px' }}>Histórico Completo de Evolução</h6>
                          {patientProntuarios.length > 0 ? (
                            <div style={{ display: 'grid', gap: '12px' }}>
                              {patientProntuarios.map(pr => (
                                <div key={pr.id} style={{ background: 'white', padding: '15px', borderRadius: '15px', fontSize: '0.85rem', border: '1px solid rgba(0,0,0,0.04)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{pr.type}</span>
                                    <span style={{ opacity: 0.6, fontSize: '0.75rem' }}>{new Date(pr.date).toLocaleDateString('pt-BR')}</span>
                                  </div>
                                  <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{pr.content}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>Nenhum prontuário registrado ainda.</p>
                          )}
                        </div>

                        {/* Financial Analysis */}
                        <div>
                          <h6 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '15px' }}>Status de Repasses</h6>
                          {patientPayments.length > 0 ? (
                            <div style={{ display: 'grid', gap: '10px' }}>
                              {patientPayments.map(pay => (
                                <div key={pay.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.04)' }}>
                                  <div>
                                    <span style={{ fontWeight: 700 }}>R$ {pay.value.toFixed(2)}</span>
                                    <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Pagamento em: {new Date(pay.paymentDate || pay.createdAt?.toDate()).toLocaleDateString('pt-BR')}</p>
                                  </div>
                                  <span style={{ 
                                    fontSize: '0.65rem', 
                                    padding: '4px 10px', 
                                    borderRadius: '100px', 
                                    background: pay.repasseConfirmado ? '#dcfce7' : '#fee2e2', 
                                    color: pay.repasseConfirmado ? '#16a34a' : '#ef4444',
                                    fontWeight: 700
                                  }}>
                                    {pay.repasseConfirmado ? 'Repasse Confirmado' : 'Pendente'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>Sem movimentações financeiras.</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorDashboard;
