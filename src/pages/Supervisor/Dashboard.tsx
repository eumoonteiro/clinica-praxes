import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot,
  updateDoc,
  doc,
  addDoc
} from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  Users, 
  History,
  MessageCircle,
  Activity,
  Settings,
  X
} from 'lucide-react';

const SupervisorDashboard = () => {
  const { userData } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [analysts, setAnalysts] = useState<any[]>([]);

  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Supervision Report form
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [selectedAnalyst, setSelectedAnalyst] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

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

  useEffect(() => {
    if (userData) {
      setEditName(userData.name || '');
      setEditEmail(userData.email || '');
    }
  }, [userData, showProfileModal]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setLoadingProfile(true);
    try {
      await updateDoc(doc(db, 'usuarios_clinica', userData.uid), {
        name: editName,
        email: editEmail
      });
      alert('Perfil atualizado com sucesso! Recarregue para ver as mudanças.');
      setShowProfileModal(false);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnalyst || !reportContent || !userData) return;
    setLoadingReport(true);
    try {
      await addDoc(collection(db, 'relatos_supervisao'), {
        supervisorUid: userData.uid,
        supervisorName: userData.name,
        analistaUid: selectedAnalyst.uid,
        analistaName: selectedAnalyst.name,
        content: reportContent,
        date: new Date().toISOString(),
        createdAt: new Date()
      });
      alert('Relato de supervisão registrado com sucesso!');
      setShowReportModal(false);
      setReportContent('');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingReport(false);
    }
  };

  const myAnalysts = analysts.filter((a: any) => a.supervisor === userData?.name);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 className="outfit">Painel do Supervisor</h1>
            <p style={{ color: 'var(--text-muted)' }}>Supervisão Clínica • {userData?.name}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn" style={{ background: '#f1f5f9', color: 'var(--primary)' }} onClick={() => setShowProfileModal(true)}>
              Meu Perfil <Settings size={18} />
            </button>
            <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => auth.signOut()}>
              Sair <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '15px', borderRadius: '15px' }}><Users size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Analistas Supervisionados</span>
              <h3 className="outfit">{myAnalysts.length}</h3>
            </div>
          </div>
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', padding: '15px', borderRadius: '15px' }}><Users size={24}/></div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pacientes Sob Supervisão</span>
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '30px' }} className="mobile-grid">
           {/* Supervised Analysts Section */}
           <div>
            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '20px' }}>Analistas que Supervisiono</h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {myAnalysts.map((a: any) => (
                  <div key={a.uid} className="glass" style={{ padding: '15px', borderRadius: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h6 style={{ margin: 0, fontSize: '1rem' }}>{a.name}</h6>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{patients.filter(p => p.analistaUid === a.uid).length} pacientes</p>
                    </div>
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.7rem', padding: '6px 12px' }}
                      onClick={() => {
                        setSelectedAnalyst(a);
                        setShowReportModal(true);
                      }}
                    >
                      Novo Relato
                    </button>
                  </div>
                ))}
                {myAnalysts.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px' }}>Nenhum analista vinculado.</p>
                )}
              </div>
            </div>
          </div>

          {/* List of Patients and their Evolutions */}
          <div>
            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}><History size={20}/> Evolução dos Casos</h4>
              <div style={{ display: 'grid', gap: '20px' }}>
                {patients.sort((a,b) => a.name.localeCompare(b.name)).map(p => {
                  const patientProntuarios = prontuarios.filter(pr => pr.patientId === p.id).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
                  const patientPayments = payments.filter(pay => pay.patientId === p.id);
                  const analista = analysts.find(a => a.uid === p.analistaUid);
                  
                  return (
                    <div key={p.id} className="glass" style={{ padding: '20px', borderRadius: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div>
                          <h5 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--primary)' }}>{p.name}</h5>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '4px 0' }}>Analista: <strong>{analista?.name || 'Não identificado'}</strong></p>
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
                              {expandedPatientId === p.id ? 'Fechar' : 'Ver Ficha'}
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
                              <h6 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '15px' }}>Histórico Evolutivo</h6>
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
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>Sem registros.</p>
                              )}
                            </div>

                            {/* Financial Analysis */}
                            <div>
                              <h6 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', opacity: 0.5, marginBottom: '15px' }}>Repasses</h6>
                              {patientPayments.length > 0 ? (
                                <div style={{ display: 'grid', gap: '10px' }}>
                                  {patientPayments.map(pay => (
                                    <div key={pay.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(0,0,0,0.04)' }}>
                                      <div>
                                        <span style={{ fontWeight: 700 }}>R$ {pay.value.toFixed(2)}</span>
                                        <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>{new Date(pay.paymentDate || pay.createdAt?.toDate()).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                      <span style={{ 
                                        fontSize: '0.65rem', 
                                        padding: '4px 10px', 
                                        borderRadius: '100px', 
                                        background: pay.repasseConfirmado ? '#dcfce7' : '#fee2e2', 
                                        color: pay.repasseConfirmado ? '#16a34a' : '#ef4444',
                                        fontWeight: 700
                                      }}>
                                        {pay.repasseConfirmado ? 'Pago' : 'Pendente'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', background: '#f8fafc', padding: '20px', borderRadius: '15px' }}>Nenhum.</p>
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
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button onClick={() => setShowProfileModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 className="outfit" style={{ marginBottom: '25px' }}>Editar Perfil</h3>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Nome Completo</label>
                <input className="form-control" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>E-mail</label>
                <input type="email" className="form-control" value={editEmail} onChange={e => setEditEmail(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loadingProfile}>
                {loadingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Supervision Report Modal */}
      {showReportModal && selectedAnalyst && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', position: 'relative' }}>
            <button onClick={() => setShowReportModal(false)} style={{ position: 'absolute', top: '20px', right: '20px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 className="outfit" style={{ marginBottom: '10px' }}>Relato de Supervisão</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Analista: <strong>{selectedAnalyst.name}</strong>
            </p>
            
            <form onSubmit={handleCreateReport}>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Conteúdo do Relato</label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '200px', resize: 'vertical' }}
                  value={reportContent}
                  onChange={e => setReportContent(e.target.value)}
                  placeholder="Descreva aqui os pontos principais da supervisão..."
                  required
                />
              </div>
              
              <div style={{ background: '#fef2f2', padding: '15px', borderRadius: '12px', border: '1px solid #fee2e2', marginBottom: '20px' }}>
                <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: 0, lineHeight: '1.4' }}>
                  <strong>Atenção:</strong> Este relato é de acesso restrito à gestão e coordenação da clínica, utilizado exclusivamente para fins de acompanhamento institucional e ajustes técnicos.
                </p>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loadingReport}>
                {loadingReport ? 'Registrando...' : 'Finalizar Registro'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorDashboard;
