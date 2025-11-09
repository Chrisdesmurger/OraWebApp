'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2, GripVertical, Rocket, Archive, Save } from 'lucide-react';
import Link from 'next/link';
import type { OnboardingConfig, OnboardingQuestion, AnswerOption } from '@/types/onboarding';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface QuestionForm extends Omit<OnboardingQuestion, 'order'> {
  tempId: string;
}

// Composant pour une question sortable
function SortableQuestion({
  question,
  index,
  onUpdate,
  onRemove,
  onAddOption,
  onRemoveOption,
  onUpdateOption,
}: {
  question: QuestionForm;
  index: number;
  onUpdate: (id: string, updates: Partial<QuestionForm>) => void;
  onRemove: (id: string) => void;
  onAddOption: (questionId: string) => void;
  onRemoveOption: (questionId: string, optionId: string) => void;
  onUpdateOption: (questionId: string, optionId: string, updates: Partial<AnswerOption>) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Question {index + 1}</CardTitle>
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
            onClick={() => onRemove(question.tempId)}
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
            onChange={(e) => onUpdate(question.tempId, { title: e.target.value })}
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
            onChange={(e) => onUpdate(question.tempId, { category: e.target.value as any })}
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
              onUpdate(question.tempId, {
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
              onClick={() => onAddOption(question.tempId)}
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
                  onUpdateOption(question.tempId, option.id, { label: e.target.value })
                }
                placeholder="Label de l'option"
                className="flex-1"
              />
              <Input
                value={option.icon || ''}
                onChange={(e) =>
                  onUpdateOption(question.tempId, option.id, { icon: e.target.value })
                }
                placeholder="Emoji"
                className="w-20"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onRemoveOption(question.tempId, option.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EditOnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [config, setConfig] = React.useState<OnboardingConfig | null>(null);
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [questions, setQuestions] = React.useState<QuestionForm[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = React.useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = React.useState(false);

  // Drag & drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Charger la configuration
  React.useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      router.push('/admin/onboarding');
      return;
    }

    const fetchConfig = async () => {
      try {
        const response = await fetchWithAuth(`/api/admin/onboarding/${params.id}`);
        if (response.ok) {
          const data: OnboardingConfig = await response.json();
          setConfig(data);
          setTitle(data.title);
          setDescription(data.description);
          setQuestions(
            data.questions.map((q) => ({
              ...q,
              tempId: q.id || `temp_${Date.now()}_${Math.random()}`,
            }))
          );
        } else {
          toast({
            title: 'Erreur',
            description: 'Configuration introuvable',
            variant: 'destructive',
          });
          router.push('/admin/onboarding');
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

    if (params.id) {
      fetchConfig();
    }
  }, [currentUser, params.id, router, toast]);

  const addQuestion = () => {
    const newQuestion: QuestionForm = {
      tempId: `temp_${Date.now()}`,
      id: '',
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
    setQuestions(questions.map((q) => (q.tempId === tempId ? { ...q, ...updates } : q)));
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
      options: question.options.map((opt) => (opt.id === optionId ? { ...opt, ...updates } : opt)),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setQuestions((items) => {
        const oldIndex = items.findIndex((item) => item.tempId === active.id);
        const newIndex = items.findIndex((item) => item.tempId === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim() || questions.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir tous les champs requis',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchWithAuth(`/api/admin/onboarding/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          questions: questions.map((q, index) => ({
            id: q.id || `q_${Date.now()}_${index}`,
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
        toast({
          title: 'Succès',
          description: 'Configuration mise à jour',
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

  const handlePublish = async () => {
    try {
      const response = await fetchWithAuth(`/api/admin/onboarding/${params.id}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Configuration publiée avec succès',
        });
        router.push('/admin/onboarding');
      } else {
        const error = await response.json();
        toast({
          title: 'Erreur',
          description: error.error || 'Erreur lors de la publication',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
    setPublishDialogOpen(false);
  };

  const handleArchive = async () => {
    try {
      const response = await fetchWithAuth(`/api/admin/onboarding/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Configuration archivée',
        });
        router.push('/admin/onboarding');
      } else {
        const error = await response.json();
        toast({
          title: 'Erreur',
          description: error.error || 'Erreur lors de l\'archivage',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Une erreur est survenue',
        variant: 'destructive',
      });
    }
    setArchiveDialogOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!config) {
    return null;
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
            <h1 className="text-3xl font-bold tracking-tight">Édition Onboarding</h1>
            <p className="text-muted-foreground">
              v{config.version} • {config.status}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {config.status === 'draft' && (
            <Button
              variant="default"
              onClick={() => setPublishDialogOpen(true)}
            >
              <Rocket className="h-4 w-4 mr-2" />
              Publier
            </Button>
          )}
          {config.status === 'active' && (
            <Button
              variant="outline"
              onClick={() => setArchiveDialogOpen(true)}
            >
              <Archive className="h-4 w-4 mr-2" />
              Archiver
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-6">
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

        {/* Questions avec drag & drop */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  {questions.length} question{questions.length !== 1 ? 's' : ''} • Glisser-déposer pour réorganiser
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
                <p className="text-muted-foreground">
                  Aucune question. Cliquez sur "Ajouter une question" pour commencer.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={questions.map((q) => q.tempId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {questions.map((question, index) => (
                      <SortableQuestion
                        key={question.tempId}
                        question={question}
                        index={index}
                        onUpdate={updateQuestion}
                        onRemove={removeQuestion}
                        onAddOption={addOption}
                        onRemoveOption={removeOption}
                        onUpdateOption={updateOption}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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

      {/* Publish Dialog */}
      <AlertDialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publier cette configuration ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action rendra cette configuration active et archivera automatiquement toutes les autres configurations actives.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>Publier</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Dialog */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver cette configuration ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette configuration ne sera plus active et ne sera plus visible par les utilisateurs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archiver</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
