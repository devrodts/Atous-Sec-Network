"""
Test ABISS System - TDD Implementation
Testa o sistema Adaptive Behaviour Intelligence Security System
"""
import unittest
from unittest.mock import Mock, patch, MagicMock
import time
import json
from typing import Dict, List, Any

from atous_sec_network.security.abiss_system import ABISSSystem, ThreatPattern, AdaptiveResponse


class TestABISSSystem(unittest.TestCase):
    """Testa o sistema ABISS (Adaptive Behaviour Intelligence Security System)"""
    
    def setUp(self):
        """Configuração inicial para cada teste"""
        self.config = {
            "model_name": "google/gemma-3n-2b",
            "learning_rate": 0.001,
            "threat_threshold": 0.7,
            "adaptation_speed": 0.1,
            "memory_size": 1000,
            "region": "BR"
        }
        self.abiss = ABISSSystem(self.config)
    
    def test_initial_configuration(self):
        """Testa configuração inicial do sistema ABISS"""
        self.assertEqual(self.abiss.config["model_name"], "google/gemma-3n-2b")
        self.assertEqual(self.abiss.config["threat_threshold"], 0.7)
        self.assertEqual(self.abiss.config["region"], "BR")
        self.assertIsNotNone(self.abiss.threat_patterns)
        self.assertIsNotNone(self.abiss.adaptive_responses)
    
    def test_threat_detection(self):
        """Testa detecção de ameaças"""
        # Simular dados de rede suspeitos
        network_data = {
            "packet_count": 1000,
            "connection_attempts": 50,
            "data_transfer_rate": 1000000,
            "source_ips": ["192.168.1.100", "10.0.0.50"],
            "destination_ports": [80, 443, 22, 3389]
        }
        
        # Detectar ameaças
        threat_score, threat_type = self.abiss.detect_threat(network_data)
        
        # Verificar resultados
        self.assertIsInstance(threat_score, float)
        self.assertGreaterEqual(threat_score, 0.0)
        self.assertLessEqual(threat_score, 1.0)
        self.assertIsInstance(threat_type, str)
    
    def test_behavioral_analysis(self):
        """Testa análise comportamental"""
        # Simular comportamento de usuário
        user_behavior = {
            "login_time": "09:00",
            "logout_time": "17:00",
            "data_access_pattern": ["file1", "file2", "file3"],
            "network_usage": 5000000,
            "commands_executed": ["ls", "cd", "cat"]
        }
        
        # Analisar comportamento
        behavior_score, anomalies = self.abiss.analyze_behavior(user_behavior)
        
        # Verificar resultados
        self.assertIsInstance(behavior_score, float)
        self.assertGreaterEqual(behavior_score, 0.0)
        self.assertLessEqual(behavior_score, 1.0)
        self.assertIsInstance(anomalies, list)
    
    def test_adaptive_response_generation(self):
        """Testa geração de respostas adaptativas"""
        # Simular ameaça detectada
        threat_data = {
            "threat_score": 0.8,
            "threat_type": "brute_force",
            "source_ip": "192.168.1.100",
            "timestamp": time.time()
        }
        
        # Gerar resposta adaptativa
        response = self.abiss.generate_adaptive_response(threat_data)
        
        # Verificar resposta
        self.assertIsInstance(response, AdaptiveResponse)
        self.assertIsInstance(response.action, str)
        self.assertIsInstance(response.priority, int)
        self.assertIsInstance(response.parameters, dict)
    
    def test_threat_pattern_learning(self):
        """Testa aprendizado de padrões de ameaça"""
        # Simular novo padrão de ameaça
        new_pattern = {
            "pattern_type": "ddos_attack",
            "indicators": ["high_packet_rate", "multiple_sources"],
            "severity": 0.9,
            "frequency": 0.1
        }
        
        # Aprender novo padrão
        pattern_id = self.abiss.learn_threat_pattern(new_pattern)
        
        # Verificar se o padrão foi aprendido
        self.assertIsInstance(pattern_id, str)
        self.assertIn(pattern_id, self.abiss.threat_patterns)
        
        # Verificar se o padrão pode ser recuperado
        retrieved_pattern = self.abiss.get_threat_pattern(pattern_id)
        self.assertEqual(retrieved_pattern.pattern_type, "ddos_attack")
    
    def test_response_effectiveness_evaluation(self):
        """Testa avaliação da eficácia das respostas"""
        # Simular resposta aplicada
        response = AdaptiveResponse(
            action="block_ip",
            priority=1,
            parameters={"ip": "192.168.1.100", "duration": 3600},
            timestamp=time.time()
        )
        
        # Simular resultado da resposta
        outcome = {
            "threat_stopped": True,
            "false_positive": False,
            "response_time": 2.5,
            "collateral_damage": 0.1
        }
        
        # Avaliar eficácia
        effectiveness = self.abiss.evaluate_response_effectiveness(response, outcome)
        
        # Verificar avaliação
        self.assertIsInstance(effectiveness, float)
        self.assertGreaterEqual(effectiveness, 0.0)
        self.assertLessEqual(effectiveness, 1.0)
    
    def test_continuous_learning(self):
        """Testa aprendizado contínuo do sistema"""
        # Reduzir threshold para garantir detecção
        self.abiss.config["threat_threshold"] = 0.1
        
        # Simular múltiplas interações
        for i in range(10):
            # Simular dados de rede suspeitos
            network_data = {
                "packet_count": 10000 + i * 1000,  # Alto volume de pacotes
                "connection_attempts": 50 + i * 10,  # Muitas tentativas
                "data_transfer_rate": 10000000 + i * 1000000,  # Alta taxa de transferência
                "source_ips": [f"192.168.1.{100 + i}"],
                "destination_ports": [22, 3389, 445]  # Portas suspeitas
            }
            
            # Detectar ameaças
            threat_score, threat_type = self.abiss.detect_threat(network_data)
            
            # Gerar resposta se necessário
            if threat_score > self.abiss.config["threat_threshold"]:
                threat_data = {
                    "threat_score": threat_score,
                    "threat_type": threat_type,
                    "source_ip": network_data["source_ips"][0],
                    "timestamp": time.time()
                }
                response = self.abiss.generate_adaptive_response(threat_data)
                
                # Simular resultado
                outcome = {
                    "threat_stopped": threat_score > 0.8,
                    "false_positive": threat_score < 0.3,
                    "response_time": 1.0 + i * 0.1,
                    "collateral_damage": 0.05
                }
                
                # Aprender com o resultado
                self.abiss.learn_from_outcome(response, outcome)
        
        # Verificar que o sistema aprendeu
        self.assertGreater(len(self.abiss.learning_history), 0)
    
    def test_threat_intelligence_sharing(self):
        """Testa compartilhamento de inteligência de ameaças"""
        # Simular ameaça detectada
        threat_info = {
            "threat_type": "malware_infection",
            "indicators": ["suspicious_process", "network_anomaly"],
            "severity": 0.8,
            "source": "internal_detection",
            "timestamp": time.time()
        }
        
        # Compartilhar inteligência
        shared_data = self.abiss.share_threat_intelligence(threat_info)
        
        # Verificar dados compartilhados
        self.assertIsInstance(shared_data, dict)
        self.assertIn("threat_type", shared_data)
        self.assertIn("indicators", shared_data)
        self.assertIn("severity", shared_data)
        self.assertIn("anonymized", shared_data)
    
    def test_behavioral_baseline_establishment(self):
        """Testa estabelecimento de linha base comportamental"""
        # Simular dados históricos de comportamento
        historical_data = []
        for i in range(100):
            behavior = {
                "user_id": f"user_{i % 10}",
                "login_time": f"{8 + i % 8}:00",
                "logout_time": f"{16 + i % 4}:00",
                "data_access_count": 50 + i % 20,
                "network_usage": 1000000 + i % 500000,
                "commands_count": 20 + i % 10
            }
            historical_data.append(behavior)
        
        # Estabelecer linha base
        baseline = self.abiss.establish_behavioral_baseline(historical_data)
        
        # Verificar linha base
        self.assertIsInstance(baseline, dict)
        self.assertIn("login_patterns", baseline)
        self.assertIn("data_access_patterns", baseline)
        self.assertIn("network_usage_patterns", baseline)
    
    def test_anomaly_detection(self):
        """Testa detecção de anomalias"""
        # Estabelecer linha base
        baseline = {
            "login_patterns": {"avg_time": "09:00", "std_dev": 1.0},
            "data_access_patterns": {"avg_count": 50, "std_dev": 10},
            "network_usage_patterns": {"avg_usage": 1000000, "std_dev": 200000}
        }
        
        # Simular comportamento anômalo
        anomalous_behavior = {
            "login_time": "03:00",  # Horário anômalo
            "data_access_count": 200,  # Muito acima da média
            "network_usage": 5000000  # Uso excessivo
        }
        
        # Detectar anomalias
        anomalies = self.abiss.detect_anomalies(anomalous_behavior, baseline)
        
        # Verificar detecção
        self.assertIsInstance(anomalies, list)
        self.assertGreater(len(anomalies), 0)
        
        for anomaly in anomalies:
            self.assertIn("type", anomaly)
            self.assertIn("severity", anomaly)
            self.assertIn("description", anomaly)
    
    def test_response_optimization(self):
        """Testa otimização de respostas baseada em histórico"""
        # Simular histórico de respostas
        response_history = []
        for i in range(50):
            response = AdaptiveResponse(
                action="block_ip" if i % 2 == 0 else "rate_limit",
                priority=1 + i % 3,
                parameters={"duration": 3600 + i * 100},
                timestamp=time.time() - i * 3600
            )
            
            outcome = {
                "threat_stopped": i % 3 != 0,
                "false_positive": i % 5 == 0,
                "response_time": 1.0 + i * 0.1,
                "collateral_damage": 0.05 + i * 0.01
            }
            
            response_history.append((response, outcome))
        
        # Otimizar respostas
        optimized_responses = self.abiss.optimize_responses(response_history)
        
        # Verificar otimização
        self.assertIsInstance(optimized_responses, dict)
        self.assertIn("best_actions", optimized_responses)
        self.assertIn("parameter_optimizations", optimized_responses)
    
    def test_gemma_model_integration(self):
        """Testa integração com modelo Gemma 3N"""
        # Verificar se o modelo está carregado
        model_info = self.abiss.get_model_info()
        
        self.assertIn("model_name", model_info)
        self.assertIn("model_loaded", model_info)
        self.assertIn("model_size", model_info)
        
        # Testar inferência do modelo
        test_input = "Detect suspicious network activity from IP 192.168.1.100"
        
        try:
            result = self.abiss.run_model_inference(test_input)
            self.assertIsInstance(result, dict)
            self.assertIn("analysis", result)
            self.assertIn("confidence", result)
        except Exception as e:
            # Modelo pode não estar disponível em ambiente de teste
            self.assertIn("model", str(e).lower() or "inference", str(e).lower())
    
    def test_real_time_monitoring(self):
        """Testa monitoramento em tempo real"""
        # Iniciar monitoramento
        self.abiss.start_real_time_monitoring()
        
        # Verificar se está monitorando
        self.assertTrue(self.abiss.is_monitoring)
        
        # Simular dados em tempo real
        for i in range(5):
            real_time_data = {
                "timestamp": time.time(),
                "network_traffic": 1000000 + i * 100000,
                "active_connections": 10 + i,
                "cpu_usage": 20 + i * 5,
                "memory_usage": 50 + i * 2
            }
            
            # Processar dados em tempo real
            alerts = self.abiss.process_real_time_data(real_time_data)
            
            # Verificar alertas
            self.assertIsInstance(alerts, list)
        
        # Parar monitoramento
        self.abiss.stop_real_time_monitoring()
        self.assertFalse(self.abiss.is_monitoring)
    
    def test_threat_correlation(self):
        """Testa correlação de ameaças"""
        # Simular múltiplas ameaças relacionadas
        threats = [
            {
                "type": "port_scan",
                "source_ip": "192.168.1.100",
                "timestamp": time.time() - 3600,
                "severity": 0.6
            },
            {
                "type": "brute_force",
                "source_ip": "192.168.1.100",
                "timestamp": time.time() - 1800,
                "severity": 0.8
            },
            {
                "type": "data_exfiltration",
                "source_ip": "192.168.1.100",
                "timestamp": time.time(),
                "severity": 0.9
            }
        ]
        
        # Correlacionar ameaças
        correlation = self.abiss.correlate_threats(threats)
        
        # Verificar correlação
        self.assertIsInstance(correlation, dict)
        self.assertIn("campaign_detected", correlation)
        self.assertIn("threat_chain", correlation)
        self.assertIn("overall_severity", correlation)
    
    def test_adaptive_threshold_adjustment(self):
        """Testa ajuste adaptativo de thresholds"""
        # Simular mudança no ambiente
        environmental_factors = {
            "network_load": 0.8,
            "threat_landscape": "high",
            "false_positive_rate": 0.15,
            "response_time": 2.5
        }
        
        # Ajustar thresholds
        old_threshold = self.abiss.config["threat_threshold"]
        self.abiss.adjust_thresholds(environmental_factors)
        new_threshold = self.abiss.config["threat_threshold"]
        
        # Verificar ajuste
        self.assertNotEqual(old_threshold, new_threshold)
        self.assertGreaterEqual(new_threshold, 0.0)
        self.assertLessEqual(new_threshold, 1.0)


class TestThreatPattern(unittest.TestCase):
    """Testa a classe ThreatPattern"""
    
    def test_threat_pattern_creation(self):
        """Testa criação de padrão de ameaça"""
        pattern_data = {
            "pattern_type": "malware_behavior",
            "indicators": ["file_creation", "registry_modification", "network_connection"],
            "severity": 0.8,
            "frequency": 0.05,
            "description": "Typical malware behavior pattern"
        }
        
        pattern = ThreatPattern(**pattern_data)
        
        self.assertEqual(pattern.pattern_type, "malware_behavior")
        self.assertEqual(len(pattern.indicators), 3)
        self.assertEqual(pattern.severity, 0.8)
        self.assertEqual(pattern.frequency, 0.05)
    
    def test_pattern_matching(self):
        """Testa correspondência de padrões"""
        pattern = ThreatPattern(
            pattern_type="ddos_attack",
            indicators=["high_packet_rate", "multiple_sources", "syn_flood"],
            severity=0.9,
            frequency=0.1
        )
        
        # Simular dados de rede
        network_data = {
            "packet_rate": 10000,
            "source_count": 1000,
            "syn_packets": 8000
        }
        
        # Verificar correspondência
        match_score = pattern.match(network_data)
        
        self.assertIsInstance(match_score, float)
        self.assertGreaterEqual(match_score, 0.0)
        self.assertLessEqual(match_score, 1.0)


class TestAdaptiveResponse(unittest.TestCase):
    """Testa a classe AdaptiveResponse"""
    
    def test_response_creation(self):
        """Testa criação de resposta adaptativa"""
        response = AdaptiveResponse(
            action="block_ip",
            priority=1,
            parameters={"ip": "192.168.1.100", "duration": 3600},
            timestamp=time.time()
        )
        
        self.assertEqual(response.action, "block_ip")
        self.assertEqual(response.priority, 1)
        self.assertIn("ip", response.parameters)
        self.assertIn("duration", response.parameters)
    
    def test_response_execution(self):
        """Testa execução de resposta"""
        response = AdaptiveResponse(
            action="rate_limit",
            priority=2,
            parameters={"rate": 100, "window": 60},
            timestamp=time.time()
        )
        
        # Simular execução
        execution_result = response.execute()
        
        self.assertIsInstance(execution_result, dict)
        self.assertIn("success", execution_result)
        self.assertIn("execution_time", execution_result)


if __name__ == '__main__':
    unittest.main()