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
  ArrowRight,
  ChevronDown,
  ChevronUp
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
  const analysts = registeredUsers.filter(u => u.role === 'analista');
  const pendingUsers = authorizedUsers.filter(au => !registeredUsers.some(ru => ru.cpf === au.cpf));

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

        {/* FEATURED BLOCKS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '30px', marginBottom: '40px' }}>
          
          {/* User Management FEATURED BLOCK */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '5px solid #4338ca' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: '#e0e7ff', color: '#4338ca', padding: '12px', borderRadius: '12px' }}><Users size={28}/></div>
                <h3 className="outfit" style={{ margin: 0 }}>Gestão de Usuários</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Controle total sobre a equipe clínica. Gerencie permissões, edite perfis e acompanhe o engajamento dos profissionais.
              </p>
              <div style={{ display: 'grid', gap: '10px', marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Analistas Registrados</span>
                  <strong style={{ color: '#4338ca' }}>{analysts.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Supervisores</span>
                  <strong style={{ color: '#4338ca' }}>{supervisors.length}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Aguardando Registro</span>
                  <strong style={{ color: '#f59e0b' }}>{pendingUsers.length}</strong>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button onClick={() => navigate('/coordenacao/usuarios')} className="btn btn-primary" style={{ background: '#4338ca', fontSize: '0.85rem' }}>
                Gerenciar Equipe
              </button>
              <button onClick={() => navigate('/coordenacao/usuarios/novo')} className="btn" style={{ background: '#f1f5f9', color: 'var(--primary)', fontSize: '0.85rem' }}>
                Novo Cadastro
              </button>
            </div>
          </div>

          {/* Clinical Financial FEATURED BLOCK */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '5px solid #16a34a' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
                <div style={{ background: '#dcfce7', color: '#16a34a', padding: '12px', borderRadius: '12px' }}><DollarSign size={28}/></div>
                <h3 className="outfit" style={{ margin: 0 }}>Financeiro da Clínica</h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '20px' }}>
                Acompanhe o fluxo de caixa, repasses técnicos e o desempenho financeiro institucional deste mês.
              </p>
              <div style={{ display: 'grid', gap: '10px', marginBottom: '25px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Pacientes Ativos</span>
                  <strong style={{ color: '#16a34a' }}>{totalPacientesAtivos}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>Status do Mês</span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>{currentMonth}/{currentYear}</span>
                </div>
              </div>
            </div>
            <button onClick={() => navigate('/coordenacao/financeiro')} className="btn" style={{ width: '100%', background: '#dcfce7', color: '#16a34a', fontWeight: 700 }}>
              Ver Relatório Completo <ArrowRight size={18} style={{ marginLeft: '8px' }}/>
            </button>
          </div>
        </div>

        {/* Nucleos de Supervisão Section */}
        <div className="card" style={{ borderTop: '5px solid var(--secondary)' }}>
          <h3 className="outfit" style={{ marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Award size={28} color="var(--secondary)"/> Núcleos de Supervisão Clínica
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
            {supervisors.map(sv => {
                const svNameClean = sv.name?.trim().toLowerCase();
                // Get all authorized analysts for this supervisor
                const svAuthorized = authorizedUsers.filter(au => au.supervisor?.trim().toLowerCase() === svNameClean);
                const svRelatos = relatos.filter(r => r.supervisorUid === sv.uid);

                return (
                <div key={sv.uid} className="glass" style={{ padding: '15px', borderRadius: '20px' }}>
                  <div 
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => setExpandedSupervisorId(expandedSupervisorId === sv.uid ? null : sv.uid)}
                  >
                    <div>
                      <h5 style={{ margin: 0 }}>{sv.name}</h5>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{svAuthorized.length} profissionais vinculados</p>
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
                            {svAuthorized.map(auth => {
                               const isReg = registeredUsers.some(ru => ru.cpf?.replace(/\D/g, '') === auth.cpf?.replace(/\D/g, ''));
                               return (
                                <span key={auth.id} style={{ 
                                  fontSize: '0.8rem', 
                                  padding: '4px 12px', 
                                  background: isReg ? 'white' : '#fff7ed', 
                                  borderRadius: '100px', 
                                  border: isReg ? '1px solid #e2e8f0' : '1px solid #fdba74',
                                  color: isReg ? 'inherit' : '#9a3412'
                                }}>
                                  {auth.name} {!isReg && <span style={{fontSize: '0.65rem', opacity: 0.7}}>(Pendente)</span>}
                                </span>
                               );
                            })}
                            {svAuthorized.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Nenhum analista vinculado.</p>}
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
    </div>
  );
};

export default CoordenacaoDashboard;
