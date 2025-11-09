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
import { ArrowLeft, Plus, Trash2, GripVertical } from 'lucide-react';
import Link from 'next/link';
import type { OnboardingQuestion, AnswerOption } from '@/types/onboarding';

interface QuestionForm extends Omit<OnboardingQuestion, 'id' | 'order'> {
  tempId: string;
}

export default function NewOnboardingPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [questions, setQuestions] = React.useState<QuestionForm[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Vérifier les permissions
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/admin/onboarding');
    }
  }, [currentUser, router]);

  const addQuestion = () => {
    const newQuestion: QuestionForm = {
      tempId: `temp_${Date.now()}`,
      category: 'goals',
      title: '',
      titleFr: '',
      titleEn: '',
      subtitle: '',
      type: {
        kind: 'multiple_choice',
        allowMultiple: false,
      },
      options: [],
      required: true,
    };
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (tempId: string) => {
    setQuestions(questions.filter((q) => q.tempId !== tempId));
  };

  const updateQuestion = (tempId: string, updates: Partial<QuestionForm>) => {
    setQuestions(
      questions.map((q) =>
        q.tempId === tempId ? { ...q, ...updates } : q
      )
    );
  };

  const addOption = (questionTempId: string) => {
    const question = questions.find((q) => q.tempId === questionTempId);
    if (!question) return;

    const newOption: AnswerOption = {
      id: `opt_${Date.now()}`,
      label: '',
      labelFr: '',
      labelEn: '',
      icon: '',
      order: question.options.length,
    };

    updateQuestion(questionTempId, {
      options: [...question.options, newOption],
    });
  };

  const removeOption = (questionTempId: string, optionId: string) => {
    const question = questions.find((q) => q.tempId === questionTempId);
    if (!question) return;

    updateQuestion(questionTempId, {
      options: question.options.filter((opt) => opt.id !== optionId),
    });
  };

  const updateOption = (
    questionTempId: string,
    optionId: string,
    updates: Partial<AnswerOption>
  ) => {
    const question = questions.find((q) => q.tempId === questionTempId);
    if (!question) return;

    updateQuestion(questionTempId, {
      options: question.options.map((opt) =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      ),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: 'Erreur',
        description: 'Le titre est requis',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Erreur',
        description: 'La description est requise',
        variant: 'destructive',
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Au moins une question est requise',
        variant: 'destructive',
      });
      return;
    }

    // Valider les questions
    for (const q of questions) {
      if (!q.title.trim()) {
        toast({
          title: 'Erreur',
          description: 'Toutes les questions doivent avoir un titre',
          variant: 'destructive',
        });
        return;
      }

      if (q.options.length === 0) {
        toast({
          title: 'Erreur',
          description: 'Toutes les questions doivent avoir au moins une option',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithAuth('/api/admin/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          questions: questions.map((q, index) => ({
            category: q.category,
            title: q.title,
            titleFr: q.titleFr || q.title,
            titleEn: q.titleEn || q.title,
            subtitle: q.subtitle,
            type: q.type,
            options: q.options,
            required: q.required,
            order: index,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Succès',
          description: 'Configuration d\'onboarding créée avec succès',
        });
        router.push(`/admin/onboarding/${data.id}`);
      } else {
        const error = await response.json();
        toast({
          title: 'Erreur',
          description: error.error || 'Erreur lors de la création',
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/onboarding">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouvelle Configuration Onboarding</h1>
          <p className="text-muted-foreground">Créez un nouveau questionnaire d'accueil</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>Titre et description du questionnaire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Questionnaire de bienvenue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez l'objectif de ce questionnaire..."
                rows={3}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  {questions.length} question{questions.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
              <Button type="button" onClick={addQuestion} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une question
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Aucune question. Cliquez sur "Ajouter une question" pour commencer.</p>
              </div>
            ) : (
              questions.map((question, qIndex) => (
                <Card key={question.tempId} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">Question {qIndex + 1}</CardTitle>
                          <CardDescription>
                            {question.type.kind === 'multiple_choice' && 'Choix multiples'}
                            {question.type.kind === 'rating' && 'Notation'}
                            {question.type.kind === 'text_input' && 'Texte libre'}
                            {question.type.kind === 'time_selection' && 'Sélection de temps'}
                          </CardDescription>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.tempId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Titre de la question */}
                    <div className="space-y-2">
                      <Label>Titre de la question *</Label>
                      <Input
                        value={question.title}
                        onChange={(e) =>
                          updateQuestion(question.tempId, { title: e.target.value })
                        }
                        placeholder="Ex: Quels sont vos objectifs ?"
                        required
                      />
                    </div>

                    {/* Catégorie */}
                    <div className="space-y-2">
                      <Label>Catégorie</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={question.category}
                        onChange={(e) =>
                          updateQuestion(question.tempId, { category: e.target.value as any })
                        }
                      >
                        <option value="goals">Objectifs</option>
                        <option value="experience">Expérience</option>
                        <option value="preferences">Préférences</option>
                        <option value="personalization">Personnalisation</option>
                      </select>
                    </div>

                    {/* Type de question */}
                    <div className="space-y-2">
                      <Label>Type de question</Label>
                      <select
                        className="w-full px-3 py-2 border rounded-md"
                        value={question.type.kind}
                        onChange={(e) =>
                          updateQuestion(question.tempId, {
                            type: { ...question.type, kind: e.target.value as any },
                          })
                        }
                      >
                        <option value="multiple_choice">Choix multiples</option>
                        <option value="rating">Notation</option>
                        <option value="text_input">Texte libre</option>
                        <option value="time_selection">Sélection de temps</option>
                      </select>
                    </div>

                    {/* Options de réponse */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Options de réponse ({question.options.length})</Label>
                        <Button
                          type="button"
                          onClick={() => addOption(question.tempId)}
                          variant="outline"
                          size="sm"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Option
                        </Button>
                      </div>

                      {question.options.map((option) => (
                        <div key={option.id} className="flex gap-2">
                          <Input
                            value={option.label}
                            onChange={(e) =>
                              updateOption(question.tempId, option.id, {
                                label: e.target.value,
                              })
                            }
                            placeholder="Label de l'option"
                            className="flex-1"
                          />
                          <Input
                            value={option.icon || ''}
                            onChange={(e) =>
                              updateOption(question.tempId, option.id, {
                                icon: e.target.value,
                              })
                            }
                            placeholder="Emoji"
                            className="w-20"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(question.tempId, option.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
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
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Création...' : 'Créer la configuration'}
          </Button>
        </div>
      </form>
    </div>
  );
}
