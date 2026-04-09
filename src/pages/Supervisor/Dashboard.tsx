import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot,
  updateDoc,
  doc,
  addDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogOut, 
  Users, 
  Activity,
  Settings,
  X,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';

const SupervisorDashboard = () => {
  const { userData } = useAuth();
  
  const [allPatients, setAllPatients] = useState<any[]>([]);
  const [prontuarios, setProntuarios] = useState<any[]>([]);
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<any[]>([]);
  const [allAuthorizedUsers, setAllAuthorizedUsers] = useState<any[]>([]);
  const [allRelatos, setAllRelatos] = useState<any[]>([]);

  const [expandedAnalystId, setExpandedAnalystId] = useState<string | null>(null);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportContent, setReportContent] = useState('');
  const [selectedAnalyst, setSelectedAnalyst] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const sanitizeCpf = (cpf: string) => cpf?.replace(/\D/g, '') || '';

  useEffect(() => {
    const unsubAuth = onSnapshot(collection(db, 'usuarios_autorizados'), (snap) => {
      setAllAuthorizedUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubReg = onSnapshot(collection(db, 'usuarios_clinica'), (snap) => {
      setAllRegisteredUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snap) => {
      setAllPatients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubProntuarios = onSnapshot(collection(db, 'prontuarios'), (snap) => {
      setProntuarios(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubRelatos = onSnapshot(collection(db, 'relatos_supervisao'), (snap) => {
      setAllRelatos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubAuth(); unsubReg(); unsubPatients(); unsubProntuarios(); unsubRelatos();
    };
  }, []);

  const { myAnalysts, myPatients } = useMemo(() => {
    if (!userData) return { myAnalysts: [], myPatients: [] };

    const myName = userData.name?.trim().toLowerCase() || '';
    const myEmail = userData.email?.trim().toLowerCase() || '';
    const list: any[] = [];

    allAuthorizedUsers.forEach((a: any) => {
      const authSupervisor = a.supervisor?.trim().toLowerCase() || '';
      if (authSupervisor === myName || (authSupervisor && myEmail.includes(authSupervisor))) {
        const cleanAuthCpf = sanitizeCpf(a.cpf);
        const matchingReg = allRegisteredUsers.find(r => sanitizeCpf(r.cpf) === cleanAuthCpf);
        list.push({
          ...a,
          uid: matchingReg?.uid || '',
          isRegistered: !!matchingReg,
          name: matchingReg?.name || a.name 
        });
      }
    });

    const analystCpfs = list.map(a => sanitizeCpf(a.cpf));
    const analystUids = list.filter(a => a.uid).map(a => a.uid);

    const patients = allPatients.filter((p: any) => {
      const cleanPatientAnalystCpf = sanitizeCpf(p.analistaCpf);
      return (p.analistaUid && analystUids.includes(p.analistaUid)) || 
             (cleanPatientAnalystCpf && analystCpfs.includes(cleanPatientAnalystCpf));
    });

    return { myAnalysts: list, myPatients: patients };
  }, [userData, allRegisteredUsers, allAuthorizedUsers, allPatients]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setLoadingProfile(true);
    try {
      await updateDoc(doc(db, 'usuarios_clinica', userData.uid), {
        name: editName,
        email: editEmail
      });
      alert('Perfil atualizado com sucesso!');
      setShowProfileModal(false);
    } catch (err: any) { alert(err.message); } finally { setLoadingProfile(false); }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnalyst || !reportContent || !userData) return;
    setLoadingReport(true);
    try {
      await addDoc(collection(db, 'relatos_supervisao'), {
        supervisorUid: userData.uid,
        supervisorName: userData.name,
        analistaUid: selectedAnalyst.uid || '',
        analistaCpf: selectedAnalyst.cpf || '',
        analistaName: selectedAnalyst.name,
        content: reportContent,
        date: new Date().toISOString(),
        createdAt: new Date()
      });
      alert('Relato de supervisão registrado com sucesso!');
      setShowReportModal(false);
      setReportContent('');
    } catch (err: any) { alert(err.message); } finally { setLoadingReport(false); }
  };

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
              <h3 className="outfit">{myPatients.length}</h3>
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

        {/* Main Content: Analyst Focus */}
        <div className="card">
          <h4 className="outfit" style={{ marginBottom: '30px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Users size={24} color="var(--primary)"/> Núcleos sob minha Supervisão
          </h4>
          
          <div style={{ display: 'grid', gap: '25px' }}>
            {myAnalysts.map((analyst: any) => {
              const analystId = analyst.uid || analyst.cpf;
              const isExpanded = expandedAnalystId === analystId;
              
              const myAnalystPatients = myPatients.filter(p => {
                const cleanP = sanitizeCpf(p.analistaCpf);
                const cleanA = sanitizeCpf(analyst.cpf);
                return (p.analistaUid && p.analistaUid === analyst.uid) || (cleanP && cleanP === cleanA);
              });
              
              const myAnalystRelatos = allRelatos.filter(r => (r.analistaUid && r.analistaUid === analyst.uid) || (r.analistaCpf && r.analistaCpf === analyst.cpf)).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);

              return (
                <div key={analystId} className="glass" style={{ padding: '0', borderRadius: '25px', overflow: 'hidden', border: isExpanded ? '2px solid var(--primary)' : '1px solid #e2e8f0' }}>
                  {/* Analyst Banner/Header */}
                  <div 
                    style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? '#f8faff' : 'white' }}
                    onClick={() => setExpandedAnalystId(isExpanded ? null : analystId)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '50px', height: '50px', background: 'var(--primary)', color: 'white', borderRadius: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700 }}>
                        {analyst.name.charAt(0)}
                      </div>
                      <div>
                        <h5 style={{ margin: 0, fontSize: '1.2rem' }}>
                          {analyst.name}
                          {!analyst.isRegistered && <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '6px', marginLeft: '10px' }}>Registro Pendente</span>}
                        </h5>
                        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {myAnalystPatients.length} pacientes • {myAnalystRelatos.length} relatos de supervisão
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnalyst(analyst);
                          setShowReportModal(true);
                        }}
                      >
                        Novo Relato
                      </button>
                      {isExpanded ? <ChevronUp /> : <ChevronDown />}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ overflow: 'hidden' }}
                      >
                        <div style={{ padding: '30px', borderTop: '1px solid #e2e8f0', background: 'white' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.5fr) 1fr', gap: '40px' }} className="mobile-grid">
                            
                            {/* Patients Column */}
                            <div>
                               <h6 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <Activity size={16}/> Evolução dos Pacientes
                               </h6>
                               <div style={{ display: 'grid', gap: '15px' }}>
                                  {myAnalystPatients.map(p => {
                                    const isPatientExpanded = expandedPatientId === p.id;
                                    const patientProntuarios = prontuarios.filter(pr => pr.patientId === p.id).sort((a: any, b: any) => b.createdAt?.seconds - a.createdAt?.seconds);
                                    
                                    return (
                                      <div key={p.id} style={{ border: '1px solid #f1f5f9', borderRadius: '16px', padding: '15px' }}>
                                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</span>
                                              <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-muted)' }}>Periodicidade: {p.evolucaoFrequencia || 'Semanal'}</p>
                                            </div>
                                            <button 
                                              className="btn" 
                                              style={{ padding: '4px 12px', fontSize: '0.7rem', background: isPatientExpanded ? '#f1f5f9' : 'var(--accent-glow)', color: isPatientExpanded ? 'var(--text-muted)' : 'var(--secondary)' }}
                                              onClick={() => setExpandedPatientId(isPatientExpanded ? null : p.id)}
                                            >
                                              {isPatientExpanded ? 'Fechar' : 'Ver Evolução'}
                                            </button>
                                         </div>
                                         <AnimatePresence>
                                            {isPatientExpanded && (
                                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                                                <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px dashed #f1f5f9' }}>
                                                  {patientProntuarios.length > 0 ? (
                                                    <div style={{ display: 'grid', gap: '10px' }}>
                                                      {patientProntuarios.map(pr => (
                                                        <div key={pr.id} style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', fontSize: '0.8rem' }}>
                                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                            <strong style={{ color: 'var(--primary)' }}>{pr.type}</strong>
                                                            <span style={{ opacity: 0.6 }}>{new Date(pr.date).toLocaleDateString('pt-BR')}</span>
                                                          </div>
                                                          <p style={{ margin: 0, lineHeight: '1.4' }}>{pr.content}</p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  ) : (
                                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Nenhum prontuário registrado.</p>
                                                  )}
                                                </div>
                                              </motion.div>
                                            )}
                                         </AnimatePresence>
                                      </div>
                                    )
                                  })}
                                  {myAnalystPatients.length === 0 && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Este analista ainda não possui pacientes vinculados.</p>}
                               </div>
                            </div>

                            {/* Reports Column */}
                            <div style={{ borderLeft: '1px solid #f1f5f9', paddingLeft: '40px' }} className="mobile-no-border">
                              <h6 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <FileText size={16}/> Relatos de Supervisão
                               </h6>
                               <div style={{ display: 'grid', gap: '15px' }}>
                                  {myAnalystRelatos.map(r => (
                                    <div key={r.id} style={{ background: '#f8fafc', padding: '15px', borderRadius: '18px', border: '1px solid #f1f5f9' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{new Date(r.date).toLocaleDateString('pt-BR')}</span>
                                      </div>
                                      <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: '1.5', color: 'var(--text-main)' }}>{r.content}</p>
                                    </div>
                                  ))}
                                  {myAnalystRelatos.length === 0 && (
                                    <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '20px', border: '1px dashed #e2e8f0' }}>
                                       <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Nenhum relato registrado para este analista.</p>
                                    </div>
                                  )}
                               </div>
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {myAnalysts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px', background: 'white', borderRadius: '25px', border: '1px dashed #e2e8f0' }}>
                <Users size={48} color="#cbd5e1" style={{ marginBottom: '15px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Você ainda não possui analistas vinculados sob sua supervisão.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfileModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', position: 'relative', borderRadius: '25px' }}>
            <button onClick={() => setShowProfileModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={24} />
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
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px', height: '50px' }} disabled={loadingProfile}>
                {loadingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Supervision Report Modal */}
      {showReportModal && selectedAnalyst && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', position: 'relative', borderRadius: '30px' }}>
            <button onClick={() => setShowReportModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={24} />
            </button>
            <h3 className="outfit" style={{ marginBottom: '10px' }}>Relato de Supervisão</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '25px' }}>
              Analista: <strong>{selectedAnalyst.name}</strong>
            </p>
            
            <form onSubmit={handleCreateReport}>
              <div className="form-group">
                <label style={{ fontSize: '0.9rem', marginBottom: '8px', display: 'block' }}>Conteúdo do Relato</label>
                <textarea 
                  className="form-control" 
                  style={{ minHeight: '200px', resize: 'vertical', borderRadius: '20px' }}
                  value={reportContent}
                  onChange={e => setReportContent(e.target.value)}
                  placeholder="Descreva aqui os pontos principais da supervisão..."
                  required
                />
              </div>
              
              <div style={{ background: '#fef2f2', padding: '20px', borderRadius: '20px', border: '1px solid #fee2e2', marginBottom: '25px' }}>
                <p style={{ fontSize: '0.75rem', color: '#991b1b', margin: 0, lineHeight: '1.4' }}>
                  <strong>Atenção:</strong> Este relato é de acesso restrito à gestão e coordenação da clínica, utilizado exclusivamente para fins de acompanhamento institucional e ajustes técnicos.
                </p>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', height: '55px' }} disabled={loadingReport}>
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
