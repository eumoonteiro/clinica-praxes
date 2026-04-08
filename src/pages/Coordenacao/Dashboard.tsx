import { useState, useEffect } from 'react';
import { db, auth } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  LogOut, 
  Users, 
  DollarSign, 
  Award,
  UserPlus,
  ArrowRight,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const CoordenacaoDashboard = () => {
  const navigate = useNavigate();
  const [authorizedUsers, setAuthorizedUsers] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [relatos, setRelatos] = useState<any[]>([]);
  const [expandedSupervisorId, setExpandedSupervisorId] = useState<string | null>(null);

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');

  useEffect(() => {
    const unsubAuth = onSnapshot(collection(db, 'usuarios_autorizados'), (snapshot) => {
      setAuthorizedUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubReg = onSnapshot(collection(db, 'usuarios_clinica'), (snapshot) => {
      setRegisteredUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPatients = onSnapshot(collection(db, 'pacientes'), (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubRelatos = onSnapshot(collection(db, 'relatos_supervisao'), (snapshot) => {
      setRelatos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubAuth(); unsubReg(); unsubPatients(); unsubRelatos();
    };
  }, []);

  const totalPacientesAtivos = patients.filter(p => p.status === 'Ativo').length;
  
  const supervisors = registeredUsers.filter(u => u.role === 'supervisor');

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '40px 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
          <div>
            <h1 className="outfit">Gestão Estratégica</h1>
            <p style={{ color: 'var(--text-muted)' }}>Coordenação Práxis • {currentMonth}/{currentYear}</p>
          </div>
          <button className="btn" style={{ background: '#fee2e2', color: '#ef4444' }} onClick={() => auth.signOut()}>
            Sair <LogOut size={16} />
          </button>
        </div>

        {/* Quick Actions Hub */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <button onClick={() => navigate('/coordenacao/usuarios/novo')} className="card action-card" style={{ textAlign: 'left', cursor: 'pointer', border: 'none', transition: 'transform 0.2s' }}>
            <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              <UserPlus size={24}/>
            </div>
            <h4 className="outfit">Novos Membros/Pacientes</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>Autorizar profissionais e vincular casos</p>
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--secondary)', fontWeight: 600, fontSize: '0.9rem' }}>
              Acessar <ArrowRight size={16}/>
            </div>
          </button>

          <button onClick={() => navigate('/coordenacao/usuarios')} className="card action-card" style={{ textAlign: 'left', cursor: 'pointer', border: 'none', transition: 'transform 0.2s' }}>
            <div style={{ background: '#e0e7ff', color: '#4338ca', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              <Users size={24}/>
            </div>
            <h4 className="outfit">Gestão de Usuários</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>Editar permissões e monitorar analistas</p>
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '5px', color: '#4338ca', fontWeight: 600, fontSize: '0.9rem' }}>
              Acessar <ArrowRight size={16}/>
            </div>
          </button>

          <button onClick={() => navigate('/coordenacao/financeiro')} className="card action-card" style={{ textAlign: 'left', cursor: 'pointer', border: 'none', transition: 'transform 0.2s' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', width: '50px', height: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
              <DollarSign size={24}/>
            </div>
            <h4 className="outfit">Financeiro</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '5px' }}>Controle de mensalidades e repasses</p>
            <div style={{ marginTop: '15px', display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontWeight: 600, fontSize: '0.9rem' }}>
              Acessar <ArrowRight size={16}/>
            </div>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '30px' }} className="mobile-grid">
          {/* Supervisors & Relationships Block */}
          <div>
            <div className="card">
              <h4 className="outfit" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Award size={20} color="var(--secondary)"/> Núcleos de Supervisão
              </h4>
              <div style={{ display: 'grid', gap: '15px' }}>
                {supervisors.map(sv => {
                   const supervisedAnalysts = registeredUsers.filter(u => {
                      const au = authorizedUsers.find(a => a.cpf === u.cpf);
                      return au?.supervisor === sv.name;
                   });
                   const svRelatos = relatos.filter(r => r.supervisorUid === sv.uid);

                   return (
                    <div key={sv.uid} className="glass" style={{ padding: '15px', borderRadius: '20px' }}>
                      <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        onClick={() => setExpandedSupervisorId(expandedSupervisorId === sv.uid ? null : sv.uid)}
                      >
                        <div>
                          <h5 style={{ margin: 0 }}>{sv.name}</h5>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{supervisedAnalysts.length} analistas vinculados</p>
                        </div>
                        {expandedSupervisorId === sv.uid ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                      </div>

                      <AnimatePresence>
                        {expandedSupervisorId === sv.uid && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '15px' }}>
                              <h6 style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Analistas:</h6>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
                                {supervisedAnalysts.map(an => (
                                  <span key={an.uid} style={{ fontSize: '0.8rem', padding: '4px 12px', background: 'white', borderRadius: '100px', border: '1px solid #e2e8f0' }}>
                                    {an.name}
                                  </span>
                                ))}
                                {supervisedAnalysts.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum analista vinculado.</p>}
                              </div>

                              <h6 style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}>Relatos de Supervisão:</h6>
                              <div style={{ display: 'grid', gap: '10px' }}>
                                {svRelatos.sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds).map(r => (
                                  <div key={r.id} style={{ background: 'white', padding: '12px', borderRadius: '12px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--primary)' }}>Analista: {r.analistaName}</span>
                                      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{new Date(r.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <p style={{ margin: 0, lineHeight: '1.4', color: 'var(--text-main)', opacity: 0.8 }}>{r.content}</p>
                                  </div>
                                ))}
                                {svRelatos.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '10px', background: '#f8fafc', borderRadius: '10px' }}>Não há relatos registrados.</p>}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                   )
                })}
              </div>
            </div>
          </div>

          {/* Quick Info / Summaries */}
          <div style={{ display: 'grid', gap: '20px', alignContent: 'start' }}>
             <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: 'var(--accent-glow)', color: 'var(--secondary)', padding: '10px', borderRadius: '10px' }}>
                  <ClipboardList size={20}/>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Membros Ativos</span>
                  <p style={{ margin: 0, fontWeight: 700 }}>{registeredUsers.length} profissionais</p>
                </div>
             </div>

             <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: '#dcfce7', color: '#16a34a', padding: '10px', borderRadius: '10px' }}>
                  <Users size={20}/>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pacientes Ativos</span>
                  <p style={{ margin: 0, fontWeight: 700 }}>{totalPacientesAtivos} pacientes</p>
                </div>
             </div>

             <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '10px', borderRadius: '10px' }}>
                  <MessageSquare size={20}/>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total de Relatos</span>
                  <p style={{ margin: 0, fontWeight: 700 }}>{relatos.length} registros</p>
                </div>
             </div>
          </div>
        </div>
      </div>
      <style>{`
        .action-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }
      `}</style>
    </div>
  );
};

export default CoordenacaoDashboard;
