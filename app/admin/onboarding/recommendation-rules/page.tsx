'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2, Save, ToggleLeft, ToggleRight, Info, Brain } from 'lucide-react';
import Link from 'next/link';
import type { RecommendationRule, RuleCondition, OnboardingQuestion } from '@/types/onboarding';
import { validateRecommendationRule } from '@/types/onboarding';

interface RuleForm extends Omit<RecommendationRule, 'createdAt' | 'updatedAt' | 'createdBy'> {
  tempId: string;
}

interface Program {
  id: string;
  title: string;
  titleFr?: string;
  titleEn?: string;
}

// Composant pour une règle de recommandation
function RecommendationRuleCard({
  rule,
  index,
  questions,
  programs,
  onUpdate,
  onRemove,
  onAddCondition,
  onRemoveCondition,
  onUpdateCondition,
}: {
  rule: RuleForm;
  index: number;
  questions: OnboardingQuestion[];
  programs: Program[];
  onUpdate: (id: string, updates: Partial<RuleForm>) => void;
  onRemove: (id: string) => void;
  onAddCondition: (ruleId: string) => void;
  onRemoveCondition: (ruleId: string, conditionIndex: number) => void;
  onUpdateCondition: (ruleId: string, conditionIndex: number, updates: Partial<RuleCondition>) => void;
}) {
  const selectedProgram = programs.find(p => p.id === rule.programId);

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Règle {index + 1}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onUpdate(rule.tempId, { active: !rule.active })}
              >
                {rule.active ? (
                  <ToggleRight className="h-5 w-5 text-green-600" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-gray-400" />
                )}
              </Button>
            </div>
            <CardDescription>
              {selectedProgram?.title || 'Programme non sélectionné'} • Priorité {rule.priority}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(rule.tempId)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sélection du programme */}
        <div className="space-y-2">
          <Label>Programme recommandé *</Label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={rule.programId}
            onChange={(e) => {
              const program = programs.find(p => p.id === e.target.value);
              onUpdate(rule.tempId, {
                programId: e.target.value,
                programTitle: program?.title || '',
              });
            }}
            required
          >
            <option value="">Sélectionner un programme</option>
            {programs.map((program) => (
              <option key={program.id} value={program.id}>
                {program.title}
              </option>
            ))}
          </select>
        </div>

        {/* Priorité et état */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Priorité *</Label>
            <Input
              type="number"
              min="1"
              value={rule.priority}
              onChange={(e) => onUpdate(rule.tempId, { priority: parseInt(e.target.value) })}
              placeholder="1 = plus haute priorité"
            />
          </div>
          <div className="space-y-2">
            <Label>État</Label>
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant={rule.active ? 'default' : 'outline'}
                onClick={() => onUpdate(rule.tempId, { active: !rule.active })}
                className="w-full"
              >
                {rule.active ? 'Active' : 'Inactive'}
              </Button>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description / Notes</Label>
          <Textarea
            value={rule.description || ''}
            onChange={(e) => onUpdate(rule.tempId, { description: e.target.value })}
            placeholder="Notes pour les administrateurs..."
            rows={2}
          />
        </div>

        {/* Conditions */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Conditions ({rule.conditions.length})</Label>
            <Button
              type="button"
              onClick={() => onAddCondition(rule.tempId)}
              variant="outline"
              size="sm"
            >
              <Plus className="h-3 w-3 mr-1" />
              Condition
            </Button>
          </div>

          {rule.conditions.length === 0 ? (
            <div className="text-center p-4 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground">
                Aucune condition. Cliquez sur &quot;Condition&quot; pour ajouter.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rule.conditions.map((condition, conditionIndex) => (
                <div key={conditionIndex} className="p-3 border rounded-md space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Condition {conditionIndex + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveCondition(rule.tempId, conditionIndex)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Question */}
                  <div className="space-y-2">
                    <Label className="text-xs">Question *</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={condition.questionId}
                      onChange={(e) =>
                        onUpdateCondition(rule.tempId, conditionIndex, { questionId: e.target.value })
                      }
                      required
                    >
                      <option value="">Sélectionner une question</option>
                      {questions.map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Opérateur */}
                  <div className="space-y-2">
                    <Label className="text-xs">Opérateur *</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={condition.operator}
                      onChange={(e) =>
                        onUpdateCondition(rule.tempId, conditionIndex, { operator: e.target.value as any })
                      }
                      required
                    >
                      <option value="equals">Égal à</option>
                      <option value="not_equals">Différent de</option>
                      <option value="contains">Contient</option>
                      <option value="not_contains">Ne contient pas</option>
                      <option value="greater_than">Supérieur à</option>
                      <option value="less_than">Inférieur à</option>
                    </select>
                  </div>

                  {/* Valeur */}
                  <div className="space-y-2">
                    <Label className="text-xs">Valeur *</Label>
                    <Input
                      value={
                        Array.isArray(condition.value)
                          ? condition.value.join(', ')
                          : String(condition.value)
                      }
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        // Try to parse as number if it looks like a number
                        const parsedValue = !isNaN(Number(inputValue)) && inputValue.trim() !== ''
                          ? Number(inputValue)
                          : inputValue.includes(',')
                          ? inputValue.split(',').map(v => v.trim())
                          : inputValue;

                        onUpdateCondition(rule.tempId, conditionIndex, { value: parsedValue });
                      }}
                      placeholder="Valeur ou valeurs séparées par virgule"
                      className="text-sm"
                    />
                  </div>

                  {/* Poids (optionnel) */}
                  <div className="space-y-2">
                    <Label className="text-xs">Poids (optionnel)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={condition.weight || ''}
                      onChange={(e) =>
                        onUpdateCondition(rule.tempId, conditionIndex, {
                          weight: e.target.value ? parseInt(e.target.value) : undefined,
                        })
                      }
                      placeholder="0-100 (plus élevé = plus important)"
                      className="text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function RecommendationRulesPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [questions, setQuestions] = React.useState<OnboardingQuestion[]>([]);
  const [programs, setPrograms] = React.useState<Program[]>([]);
  const [rules, setRules] = React.useState<RuleForm[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Charger les données
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/admin/onboarding');
      return;
    }

    const fetchData = async () => {
      try {
        // Charger les questions de la config active
        const configResponse = await fetchWithAuth('/api/admin/onboarding/active');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          setQuestions(configData.questions || []);
        }

        // Charger les programmes disponibles
        const programsResponse = await fetchWithAuth('/api/admin/programs');
        if (programsResponse.ok) {
          const programsData = await programsResponse.json();
          setPrograms(programsData);
        }

        // Charger les règles existantes
        const rulesResponse = await fetchWithAuth('/api/admin/onboarding/recommendation-rules');
        if (rulesResponse.ok) {
          const rulesData = await rulesResponse.json();
          setRules(
            rulesData.map((r: RecommendationRule) => ({
              ...r,
              tempId: r.id || `temp_${Date.now()}_${Math.random()}`,
            }))
          );
        }
      } catch (error) {
        toast({
          title: 'Erreur',
          description: 'Erreur lors du chargement',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser, router, toast]);

  const addRule = () => {
    const newRule: RuleForm = {
      tempId: `temp_${Date.now()}`,
      id: '',
      programId: '',
      programTitle: '',
      conditions: [],
      priority: rules.length + 1,
      active: true,
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (tempId: string) => {
    setRules(rules.filter((r) => r.tempId !== tempId));
  };

  const updateRule = (tempId: string, updates: Partial<RuleForm>) => {
    setRules(rules.map((r) => (r.tempId === tempId ? { ...r, ...updates } : r)));
  };

  const addCondition = (ruleTempId: string) => {
    const rule = rules.find((r) => r.tempId === ruleTempId);
    if (!rule) return;

    const newCondition: RuleCondition = {
      questionId: '',
      operator: 'equals',
      value: '',
    };

    updateRule(ruleTempId, {
      conditions: [...rule.conditions, newCondition],
    });
  };

  const removeCondition = (ruleTempId: string, conditionIndex: number) => {
    const rule = rules.find((r) => r.tempId === ruleTempId);
    if (!rule) return;

    updateRule(ruleTempId, {
      conditions: rule.conditions.filter((_, index) => index !== conditionIndex),
    });
  };

  const updateCondition = (
    ruleTempId: string,
    conditionIndex: number,
    updates: Partial<RuleCondition>
  ) => {
    const rule = rules.find((r) => r.tempId === ruleTempId);
    if (!rule) return;

    updateRule(ruleTempId, {
      conditions: rule.conditions.map((cond, index) =>
        index === conditionIndex ? { ...cond, ...updates } : cond
      ),
    });
  };

  const handleSave = async () => {
    // Validation
    const errors: string[] = [];
    rules.forEach((rule, index) => {
      const validation = validateRecommendationRule(rule);
      if (!validation.isValid) {
        errors.push(`Règle ${index + 1}: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    });

    if (errors.length > 0) {
      toast({
        title: 'Erreurs de validation',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithAuth('/api/admin/onboarding/recommendation-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rules: rules.map((r) => ({
            id: r.id || `rule_${Date.now()}_${Math.random()}`,
            programId: r.programId,
            programTitle: r.programTitle,
            conditions: r.conditions,
            priority: r.priority,
            active: r.active,
            description: r.description,
          })),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Règles de recommandation mises à jour',
        });
        router.refresh();
      } else {
        const error = await response.json();
        toast({
          title: 'Erreur',
          description: error.error || 'Erreur lors de la sauvegarde',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/onboarding">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Règles de recommandation</h1>
            <p className="text-muted-foreground">
              Associez les réponses d&apos;onboarding aux programmes recommandés
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b">
            <Link
              href="/admin/onboarding"
              className="flex-1 py-3 px-4 text-center border-b-2 border-transparent hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors"
            >
              Questions
            </Link>
            <Link
              href="/admin/onboarding"
              className="flex-1 py-3 px-4 text-center border-b-2 border-transparent hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Info className="h-4 w-4" />
              Écrans d&apos;information
            </Link>
            <Link
              href="/admin/onboarding/recommendation-rules"
              className="flex-1 py-3 px-4 text-center border-b-2 border-primary font-medium text-primary flex items-center justify-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Règles de recommandation
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* Info Card */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Comment fonctionnent les règles ?</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>
              • Chaque règle associe un programme à des conditions basées sur les réponses d&apos;onboarding
            </p>
            <p>
              • Toutes les conditions d&apos;une règle doivent être satisfaites (logique AND)
            </p>
            <p>
              • La priorité détermine l&apos;ordre d&apos;affichage (1 = plus haute priorité)
            </p>
            <p>
              • Les règles inactives sont ignorées mais restent sauvegardées
            </p>
          </CardContent>
        </Card>

        {/* Règles */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Règles de recommandation</CardTitle>
                <CardDescription>
                  {rules.length} règle{rules.length !== 1 ? 's' : ''} • {rules.filter(r => r.active).length} active{rules.filter(r => r.active).length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button type="button" onClick={addRule} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une règle
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {rules.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Aucune règle. Cliquez sur &quot;Ajouter une règle&quot; pour commencer.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {rules
                  .sort((a, b) => a.priority - b.priority)
                  .map((rule, index) => (
                    <RecommendationRuleCard
                      key={rule.tempId}
                      rule={rule}
                      index={index}
                      questions={questions}
                      programs={programs}
                      onUpdate={updateRule}
                      onRemove={removeRule}
                      onAddCondition={addCondition}
                      onRemoveCondition={removeCondition}
                      onUpdateCondition={updateCondition}
                    />
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Link href="/admin/onboarding">
            <Button type="button" variant="outline">
              Annuler
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </div>
      </div>
    </div>
  );
}
