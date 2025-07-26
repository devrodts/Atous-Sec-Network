"""
P2P Recovery - Churn Mitigation System
Sistema de mitigação de churn e recuperação para redes P2P
"""
import threading
import time
import random
import logging
import hashlib
import json
from collections import defaultdict, deque
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass
from pathlib import Path


@dataclass
class NodeHealth:
    """Informações de saúde de um nó"""
    node_id: str
    last_seen: float
    response_time: float
    failure_count: int
    is_active: bool


class ChurnMitigation:
    """
    Sistema de mitigação de churn para redes P2P
    
    Gerencia detecção de falhas, redistribuição de dados,
    reassignação de serviços e recuperação automática.
    """
    
    def __init__(self, node_list: List[str], health_check_interval: int = 300):
        """
        Inicializa o sistema de mitigação de churn
        
        Args:
            node_list: Lista inicial de nós
            health_check_interval: Intervalo de verificação de saúde (segundos)
        """
        self.active_nodes = set(node_list)
        self.failed_nodes = {}  # node_id -> timestamp
        self.health_check_interval = health_check_interval
        self.erasure_factor = 1.5  # Redundância de dados
        
        # Estruturas de dados
        self.data_shards = defaultdict(list)
        self.service_assignments = {}
        self.routing_table = {}
        
        # Monitoramento
        self._monitor_thread = None
        self._stop_event = threading.Event()
        self.logger = logging.getLogger(__name__)
        
        # Métricas
        self.start_time = time.time()
        self.node_health = {}
        self.failure_history = deque(maxlen=1000)
        
        # Configurações
        self.max_failures_before_removal = 3
        self.recovery_timeout = 600  # 10 minutos
        self.consensus_quorum = 0.6  # 60% dos nós ativos
        
        # Inicializar saúde dos nós
        for node in node_list:
            self.node_health[node] = NodeHealth(
                node_id=node,
                last_seen=time.time(),
                response_time=0.0,
                failure_count=0,
                is_active=True
            )
    
    def start_health_monitor(self) -> None:
        """Inicia monitoramento de saúde dos nós"""
        if self._monitor_thread and self._monitor_thread.is_alive():
            return
        
        self._stop_event.clear()
        self._monitor_thread = threading.Thread(target=self._monitor_loop)
        self._monitor_thread.daemon = True
        self._monitor_thread.start()
        self.logger.info("Monitoramento de saúde iniciado")
    
    def stop_health_monitor(self) -> None:
        """Para monitoramento de saúde"""
        self._stop_event.set()
        if self._monitor_thread:
            self._monitor_thread.join()
        self.logger.info("Monitoramento de saúde parado")
    
    def _monitor_loop(self) -> None:
        """Loop principal de monitoramento"""
        while not self._stop_event.is_set():
            try:
                current_time = time.time()
                
                # Verificar saúde de todos os nós ativos
                for node in list(self.active_nodes):
                    if not self._ping_node(node):
                        self.logger.warning(f"Nó {node} inacessível!")
                        self._handle_node_failure(node, current_time)
                    else:
                        # Atualizar métricas de saúde
                        self._update_node_health(node, current_time)
                
                # Verificar recuperação de nós falhados
                self._check_node_recovery(current_time)
                
                # Limpeza periódica
                if current_time % 3600 < self.health_check_interval:  # A cada hora
                    self._cleanup_old_failures()
                
                # Sleep in shorter intervals to allow for quick stopping
                for _ in range(self.health_check_interval):
                    if self._stop_event.is_set():
                        break
                    time.sleep(1)
                
            except Exception as e:
                self.logger.error(f"Erro no loop de monitoramento: {e}")
                time.sleep(10)  # Pausa antes de tentar novamente
    
    def _ping_node(self, node: str) -> bool:
        """
        Verifica se um nó está respondendo
        
        Args:
            node: ID do nó
            
        Returns:
            True se o nó responde, False caso contrário
        """
        try:
            # Implementação real dependerá da infraestrutura de rede
            # Por enquanto, simulação com 95% de taxa de sucesso
            return random.random() > 0.05
        except Exception as e:
            self.logger.debug(f"Erro ao fazer ping em {node}: {e}")
            return False
    
    def _update_node_health(self, node: str, current_time: float) -> None:
        """Atualiza métricas de saúde de um nó"""
        if node in self.node_health:
            health = self.node_health[node]
            health.last_seen = current_time
            health.response_time = random.uniform(0.01, 0.1)  # Simulação
            health.failure_count = 0
            health.is_active = True
    
    def _handle_node_failure(self, node: str, failure_time: float) -> None:
        """
        Trata falha de um nó
        
        Args:
            node: ID do nó falhado
            failure_time: Timestamp da falha
        """
        if node in self.active_nodes:
            self.active_nodes.remove(node)
            self.failed_nodes[node] = failure_time
            
            # Atualizar saúde do nó
            if node in self.node_health:
                self.node_health[node].failure_count += 1
                self.node_health[node].is_active = False
            
            # Registrar falha
            self.failure_history.append({
                "node": node,
                "timestamp": failure_time,
                "type": "connection_failure"
            })
            
            # Executar ações de recuperação
            self._redistribute_data(node)
            self._reassign_services(node)
            self._update_routing_table(node)
            
            self.logger.info(f"Nó {node} marcado como falhado")
    
    def _check_node_recovery(self, current_time: float) -> None:
        """Verifica se nós falhados se recuperaram"""
        recovered_nodes = []
        
        for node, failure_time in list(self.failed_nodes.items()):
            # Verificar se passou tempo suficiente para tentar recuperação
            if current_time - failure_time > self.recovery_timeout:
                if self._ping_node(node):
                    recovered_nodes.append(node)
        
        # Restaurar nós recuperados
        for node in recovered_nodes:
            self._restore_node(node)
    
    def _restore_node(self, node: str) -> None:
        """Restaura um nó que se recuperou"""
        if node in self.failed_nodes:
            del self.failed_nodes[node]
            self.active_nodes.add(node)
            
            # Atualizar saúde
            if node in self.node_health:
                self.node_health[node].is_active = True
                self.node_health[node].failure_count = 0
            
            self.logger.info(f"Nó {node} restaurado")
    
    def _update_routing_table(self, failed_node: str) -> None:
        """
        Atualiza a tabela de roteamento após falha de um nó
        
        Args:
            failed_node: ID do nó falhado
        """
        # Remover o nó falhado da tabela de roteamento
        if failed_node in self.routing_table:
            del self.routing_table[failed_node]
        
        # Remover rotas para o nó falhado de todos os outros nós
        for node_routes in self.routing_table.values():
            if failed_node in node_routes:
                node_routes.remove(failed_node)
    
    def _redistribute_data(self, failed_node: str) -> None:
        """
        Redistribui dados de um nó falhado
        
        Args:
            failed_node: ID do nó falhado
        """
        if failed_node not in self.data_shards:
            return
        
        failed_shards = self.data_shards.pop(failed_node)
        available_nodes = list(self.active_nodes - {failed_node})
        
        if not available_nodes:
            self.logger.error("Nenhum nó disponível para redistribuição de dados")
            return
        
        # Garantir que todos os nós disponíveis existem no data_shards
        for node in available_nodes:
            if node not in self.data_shards:
                self.data_shards[node] = []
        
        # Distribuir shards para nós disponíveis
        shards_per_node = max(1, int(len(failed_shards) * self.erasure_factor // len(available_nodes)))
        
        for i, shard in enumerate(failed_shards):
            target_node = available_nodes[i % len(available_nodes)]
            self.data_shards[target_node].append(shard)
        
        self.logger.info(f"Dados redistribuídos de {failed_node} para {len(available_nodes)} nós")
    
    def _reassign_services(self, failed_node: str) -> None:
        """
        Reassigna serviços de um nó falhado
        
        Args:
            failed_node: ID do nó falhado
        """
        for service, assigned_node in list(self.service_assignments.items()):
            if assigned_node == failed_node:
                available_nodes = list(self.active_nodes - {failed_node})
                if available_nodes:
                    # Selecionar nó com menor carga
                    new_node = self._select_best_node_for_service(service, available_nodes)
                    self.service_assignments[service] = new_node
                    self.logger.info(f"Serviço {service} reassignado para {new_node}")
                else:
                    self.logger.error(f"Nenhum nó disponível para o serviço {service}")
    
    def _select_best_node_for_service(self, service: str, available_nodes: List[str]) -> str:
        """
        Seleciona o melhor nó para um serviço
        
        Args:
            service: Nome do serviço
            available_nodes: Lista de nós disponíveis
            
        Returns:
            ID do melhor nó
        """
        # Implementação básica - seleção aleatória
        # Em produção, considerar carga, recursos, latência, etc.
        return random.choice(available_nodes)
    
    def _cleanup_old_failures(self, max_age_minutes: int = 30) -> int:
        """
        Remove nós falhados antigos do histórico
        
        Args:
            max_age_minutes: Idade máxima em minutos
            
        Returns:
            Número de nós removidos
        """
        current_time = time.time()
        max_age_seconds = max_age_minutes * 60
        removed_count = 0
        
        for node, failure_time in list(self.failed_nodes.items()):
            if current_time - failure_time > max_age_seconds:
                del self.failed_nodes[node]
                removed_count += 1
                self.logger.debug(f"Nó falhado antigo removido: {node}")
        
        return removed_count
    
    def handle_node_failure(self, node: str) -> None:
        """
        Interface pública para tratar falha de nó
        
        Args:
            node: ID do nó falhado
        """
        self._handle_node_failure(node, time.time())
    
    def get_health_metrics(self) -> Dict[str, Any]:
        """
        Retorna métricas de saúde da rede
        
        Returns:
            Dicionário com métricas
        """
        current_time = time.time()
        uptime = current_time - self.start_time
        
        # Calcular taxa de recuperação
        recent_failures = [
            f for f in self.failure_history 
            if current_time - f["timestamp"] < 3600  # Última hora
        ]
        
        recovery_rate = 0.0
        if recent_failures:
            recovered_count = len([n for n in self.active_nodes 
                                 if n in [f["node"] for f in recent_failures]])
            recovery_rate = recovered_count / len(recent_failures)
        
        return {
            "active_nodes": len(self.active_nodes),
            "failed_nodes": len(self.failed_nodes),
            "total_nodes": len(self.active_nodes) + len(self.failed_nodes),
            "uptime": uptime,
            "recovery_rate": recovery_rate,
            "health_check_interval": self.health_check_interval,
            "node_health": {
                node: {
                    "last_seen": health.last_seen,
                    "response_time": health.response_time,
                    "failure_count": health.failure_count,
                    "is_active": health.is_active
                }
                for node, health in self.node_health.items()
            }
        }
    
    def add_node(self, node_id: str) -> None:
        """
        Adiciona novo nó à rede
        
        Args:
            node_id: ID do novo nó
        """
        if node_id not in self.active_nodes:
            self.active_nodes.add(node_id)
            self.node_health[node_id] = NodeHealth(
                node_id=node_id,
                last_seen=time.time(),
                response_time=0.0,
                failure_count=0,
                is_active=True
            )
            self.logger.info(f"Novo nó adicionado: {node_id}")
    
    def remove_node(self, node_id: str) -> None:
        """
        Remove nó da rede (desligamento gracioso)
        
        Args:
            node_id: ID do nó a ser removido
        """
        if node_id in self.active_nodes:
            self.active_nodes.remove(node_id)
            
            # Redistribuir dados e serviços
            self._redistribute_data(node_id)
            self._reassign_services(node_id)
            
            # Limpar dados do nó
            if node_id in self.node_health:
                del self.node_health[node_id]
            
            self.logger.info(f"Nó removido graciosamente: {node_id}")
    
    def _detect_byzantine_failures(self) -> List[str]:
        """
        Detecta falhas bizantinas (nós que respondem mas com dados incorretos)
        
        Returns:
            Lista de nós bizantinos detectados
        """
        byzantine_nodes = []
        
        # Implementação básica - verificar consistência de dados
        for node in self.active_nodes:
            if self._is_node_byzantine(node):
                byzantine_nodes.append(node)
        
        return byzantine_nodes
    
    def _is_node_byzantine(self, node: str) -> bool:
        """
        Verifica se um nó é bizantino
        
        Args:
            node: ID do nó
        
        Returns:
            True se o nó é bizantino
        """
        # Implementação básica - verificar se o nó tem dados corrompidos
        if node in self.data_shards:
            for shard in self.data_shards[node]:
                if "corrupted" in str(shard):
                    return True
        return False
    
    def _reach_consensus(self, decision_data: Dict, quorum: float = None) -> bool:
        """
        Alcança consenso para uma decisão
        
        Args:
            decision_data: Dados da decisão
            quorum: Fração necessária para consenso (0-1)
            
        Returns:
            True se consenso foi alcançado
        """
        if quorum is None:
            quorum = self.consensus_quorum
        
        # Implementação básica - simula consenso
        # Em produção, implementar protocolo de consenso real
        return len(self.active_nodes) >= 2  # Mínimo 2 nós ativos
    
    def _encrypt_message(self, message: str, target_node: str) -> str:
        """
        Criptografa mensagem para um nó específico
        
        Args:
            message: Mensagem a ser criptografada
            target_node: Nó de destino
            
        Returns:
            Mensagem criptografada
        """
        # Implementação básica - simulação
        # Em produção, usar criptografia real
        return f"encrypted_{message}_{target_node}"
    
    def _decrypt_message(self, encrypted_message: str, source_node: str) -> str:
        """
        Descriptografa mensagem de um nó específico
        
        Args:
            encrypted_message: Mensagem criptografada
            source_node: Nó de origem
            
        Returns:
            Mensagem descriptografada
        """
        # Implementação básica - simulação
        # Em produção, usar descriptografia real
        if encrypted_message.startswith("encrypted_"):
            return encrypted_message.replace(f"encrypted_", "").replace(f"_{source_node}", "")
        return encrypted_message
    
    def _calculate_network_diameter(self) -> int:
        """
        Calcula o diâmetro da rede (maior caminho mínimo entre dois nós)
        
        Returns:
            Diâmetro da rede
        """
        if not self.routing_table:
            return 0
        
        # Implementação básica - para rede em anel
        return len(self.routing_table) // 2
    
    def set_recovery_timeout(self, timeout: int) -> None:
        """
        Define o timeout de recuperação (útil para testes)
        
        Args:
            timeout: Timeout em segundos
        """
        self.recovery_timeout = timeout