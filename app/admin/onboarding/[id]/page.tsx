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
import { TranslationFields } from '@/components/ui/translation-fields';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, Plus, Trash2, GripVertical, Rocket, Archive, Save, Info, Brain, Languages, ChevronDown, ChevronUp } from 'lucide-react';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface QuestionForm extends Omit<OnboardingQuestion, 'order'> {
  tempId: string;
}

// Composant pour une option avec i18n
function OptionEditor({
  option,
  questionType,
  onUpdate,
  onRemove,
}: {
  option: AnswerOption;
  questionType: string;
  onUpdate: (updates: Partial<AnswerOption>) => void;
  onRemove: () => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="border rounded-md p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={option.icon || ''}
            onChange={(e) => onUpdate({ icon: e.target.value })}
            placeholder="Emoji"
            className="w-16"
          />
          <span className="text-sm text-muted-foreground">|</span>
          <Input
            value={option.labelFr || option.label || ''}
            onChange={(e) => onUpdate({ label: e.target.value, labelFr: e.target.value })}
            placeholder="Label FR"
            className="flex-1"
          />
          {questionType === 'grid_selection' && (
            <Input
              value={option.color || ''}
              onChange={(e) => onUpdate({ color: e.target.value })}
              placeholder="#FF5733"
              className="w-24"
              type="color"
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            title="Traductions"
          >
            <Languages className="h-4 w-4" />
            {isExpanded ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t">
          {/* Label translations */}
          <TranslationFields
            label="Label de l'option"
            required
            value={{
              fr: option.labelFr || option.label || '',
              en: option.labelEn || '',
              es: option.labelEs || '',
            }}
            onChange={(value) =>
              onUpdate({
                label: value.fr,
                labelFr: value.fr,
                labelEn: value.en,
                labelEs: value.es,
              })
            }
            placeholder={{
              fr: 'Label en francais',
              en: 'Label in English',
              es: 'Etiqueta en espanol',
            }}
          />

          {/* Description translations (optional) */}
          <TranslationFields
            type="textarea"
            label="Description (optionnel)"
            value={{
              fr: option.descriptionFr || option.description || '',
              en: option.descriptionEn || '',
              es: option.descriptionEs || '',
            }}
            onChange={(value) =>
              onUpdate({
                description: value.fr,
                descriptionFr: value.fr,
                descriptionEn: value.en,
                descriptionEs: value.es,
              })
            }
            placeholder={{
              fr: 'Description en francais',
              en: 'Description in English',
              es: 'Descripcion en espanol',
            }}
          />
        </div>
      )}
    </div>
  );
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

  const [isI18nExpanded, setIsI18nExpanded] = React.useState(false);

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
                {question.type.kind === 'time_selection' && 'Selection de temps'}
                {question.type.kind === 'grid_selection' && 'Grille de selection'}
                {question.type.kind === 'toggle_list' && 'Liste a bascule'}
                {question.type.kind === 'slider' && 'Curseur'}
                {question.type.kind === 'circular_picker' && 'Selecteur circulaire'}
                {question.type.kind === 'image_card' && 'Cartes avec images'}
                {question.type.kind === 'profile_group' && 'Profil groupe'}
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
        {/* i18n - Question Title */}
        <TranslationFields
          label="Titre de la question"
          required
          value={{
            fr: question.titleFr || question.title || '',
            en: question.titleEn || '',
            es: question.titleEs || '',
          }}
          onChange={(value) =>
            onUpdate(question.tempId, {
              title: value.fr,
              titleFr: value.fr,
              titleEn: value.en,
              titleEs: value.es,
            })
          }
          placeholder={{
            fr: 'Ex: Quels sont vos objectifs ?',
            en: 'Ex: What are your goals?',
            es: 'Ej: Cuales son tus objetivos?',
          }}
        />

        {/* i18n - Question Subtitle */}
        <TranslationFields
          label="Sous-titre (optionnel)"
          value={{
            fr: question.subtitleFr || question.subtitle || '',
            en: question.subtitleEn || '',
            es: question.subtitleEs || '',
          }}
          onChange={(value) =>
            onUpdate(question.tempId, {
              subtitle: value.fr,
              subtitleFr: value.fr,
              subtitleEn: value.en,
              subtitleEs: value.es,
            })
          }
          placeholder={{
            fr: 'Sous-titre explicatif',
            en: 'Explanatory subtitle',
            es: 'Subtitulo explicativo',
          }}
        />

        {/* i18n - Question Hint */}
        <Collapsible open={isI18nExpanded} onOpenChange={setIsI18nExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
              <Languages className="h-4 w-4 mr-2" />
              {isI18nExpanded ? 'Masquer' : 'Afficher'} les champs i18n supplementaires
              {isI18nExpanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <TranslationFields
              label="Indice / Hint (optionnel)"
              value={{
                fr: question.hintFr || question.hint || '',
                en: question.hintEn || '',
                es: question.hintEs || '',
              }}
              onChange={(value) =>
                onUpdate(question.tempId, {
                  hint: value.fr,
                  hintFr: value.fr,
                  hintEn: value.en,
                  hintEs: value.es,
                })
              }
              placeholder={{
                fr: 'Texte d aide pour l utilisateur',
                en: 'Help text for the user',
                es: 'Texto de ayuda para el usuario',
              }}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Categorie */}
        <div className="space-y-2">
          <Label>Categorie</Label>
          <select
            className="w-full px-3 py-2 border rounded-md"
            value={question.category}
            onChange={(e) => onUpdate(question.tempId, { category: e.target.value as any })}
          >
            <option value="goals">Objectifs</option>
            <option value="experience">Experience</option>
            <option value="preferences">Preferences</option>
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
            <option value="time_selection">Selection de temps</option>
            <option value="grid_selection">Grille de selection</option>
            <option value="toggle_list">Liste a bascule</option>
            <option value="slider">Curseur</option>
            <option value="circular_picker">Selecteur circulaire</option>
            <option value="image_card">Cartes avec images</option>
            <option value="profile_group">Profil groupe</option>
          </select>
        </div>

        {/* Configuration specifique par type */}
        {question.type.kind === 'multiple_choice' && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-md">
            <Label>Mode d&apos;affichage</Label>
            <select
              className="w-full px-3 py-2 border rounded-md"
              value={question.type.displayMode || 'list'}
              onChange={(e) =>
                onUpdate(question.tempId, {
                  type: { ...question.type, displayMode: e.target.value as any },
                })
              }
            >
              <option value="list">Liste</option>
              <option value="grid">Grille</option>
            </select>
          </div>
        )}

        {question.type.kind === 'grid_selection' && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-md">
            <Label>Nombre de colonnes</Label>
            <Input
              type="number"
              min="1"
              max="4"
              value={question.type.gridColumns || 2}
              onChange={(e) =>
                onUpdate(question.tempId, {
                  type: { ...question.type, gridColumns: parseInt(e.target.value) },
                })
              }
            />
          </div>
        )}

        {question.type.kind === 'rating' && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-md">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`showLabels_${question.tempId}`}
                checked={question.type.showLabels || false}
                onChange={(e) =>
                  onUpdate(question.tempId, {
                    type: { ...question.type, showLabels: e.target.checked },
                  })
                }
              />
              <Label htmlFor={`showLabels_${question.tempId}`}>Afficher les labels sous les icones</Label>
            </div>
          </div>
        )}

        {question.type.kind === 'text_input' && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-md">
            <div className="space-y-2">
              <Label>Nombre de lignes</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={question.type.maxLines || 1}
                onChange={(e) =>
                  onUpdate(question.tempId, {
                    type: { ...question.type, maxLines: parseInt(e.target.value) },
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Nombre maximum de caracteres</Label>
              <Input
                type="number"
                min="1"
                max="5000"
                value={question.type.maxCharacters || 500}
                onChange={(e) =>
                  onUpdate(question.tempId, {
                    type: { ...question.type, maxCharacters: parseInt(e.target.value) },
                  })
                }
              />
            </div>
            {/* i18n - Placeholder */}
            <TranslationFields
              label="Placeholder"
              value={{
                fr: question.type.placeholderFr || question.type.placeholder || '',
                en: question.type.placeholderEn || '',
                es: question.type.placeholderEs || '',
              }}
              onChange={(value) =>
                onUpdate(question.tempId, {
                  type: {
                    ...question.type,
                    placeholder: value.fr,
                    placeholderFr: value.fr,
                    placeholderEn: value.en,
                    placeholderEs: value.es,
                  },
                })
              }
              placeholder={{
                fr: 'Texte d aide...',
                en: 'Help text...',
                es: 'Texto de ayuda...',
              }}
            />
          </div>
        )}

        {(question.type.kind === 'slider' || question.type.kind === 'circular_picker') && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-md">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valeur minimale</Label>
                <Input
                  type="number"
                  value={question.type.sliderMin || 0}
                  onChange={(e) =>
                    onUpdate(question.tempId, {
                      type: { ...question.type, sliderMin: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Valeur maximale</Label>
                <Input
                  type="number"
                  value={question.type.sliderMax || 100}
                  onChange={(e) =>
                    onUpdate(question.tempId, {
                      type: { ...question.type, sliderMax: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pas (step)</Label>
                <Input
                  type="number"
                  min="1"
                  value={question.type.sliderStep || 1}
                  onChange={(e) =>
                    onUpdate(question.tempId, {
                      type: { ...question.type, sliderStep: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unite</Label>
                <Input
                  value={question.type.sliderUnit || ''}
                  onChange={(e) =>
                    onUpdate(question.tempId, {
                      type: { ...question.type, sliderUnit: e.target.value },
                    })
                  }
                  placeholder="minutes, jours..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Profile group fields */}
        {question.type.kind === 'profile_group' && (
          <div className="space-y-2 p-4 bg-muted/50 rounded-md">
            <Label className="text-sm font-semibold">Champs du profil ({question.type.fields?.length || 0})</Label>
            <div className="space-y-3 mt-2">
              {question.type.fields?.sort((a, b) => a.order - b.order).map((field, idx) => (
                <div key={idx} className="p-3 bg-background rounded border">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {field.id}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {field.inputType}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Label:</span> {field.labelFr || field.label}
                    </div>
                    {field.placeholder && (
                      <div className="col-span-2">
                        <span className="font-medium">Placeholder:</span> {field.placeholder}
                      </div>
                    )}
                    {field.inputType === 'radio' && field.options && (
                      <div className="col-span-2">
                        <span className="font-medium">Options:</span>
                        <div className="ml-4 mt-1 space-y-1">
                          {field.options.map((opt, i) => (
                            <div key={i} className="text-xs">
                              {opt.icon} {opt.labelFr || opt.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Les champs du profile_group sont definis dans la configuration JSON et ne peuvent pas etre modifies ici.
            </p>
          </div>
        )}

        {/* Options de reponse avec i18n */}
        {question.type.kind !== 'slider' && question.type.kind !== 'circular_picker' && question.type.kind !== 'text_input' && question.type.kind !== 'profile_group' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Options de reponse ({question.options.length})</Label>
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

            <div className="space-y-2">
              {question.options.map((option) => (
                <OptionEditor
                  key={option.id}
                  option={option}
                  questionType={question.type.kind}
                  onUpdate={(updates) => onUpdateOption(question.tempId, option.id, updates)}
                  onRemove={() => onRemoveOption(question.tempId, option.id)}
                />
              ))}
            </div>
          </div>
        )}
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
      titleEs: '',
      subtitle: '',
      subtitleFr: '',
      subtitleEn: '',
      subtitleEs: '',
      hint: '',
      hintFr: '',
      hintEn: '',
      hintEs: '',
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
      labelEs: '',
      description: '',
      descriptionFr: '',
      descriptionEn: '',
      descriptionEs: '',
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
            // Title with i18n
            title: q.title || q.titleFr,
            titleFr: q.titleFr || q.title,
            titleEn: q.titleEn,
            titleEs: q.titleEs,
            // Subtitle with i18n
            subtitle: q.subtitle || q.subtitleFr,
            subtitleFr: q.subtitleFr || q.subtitle,
            subtitleEn: q.subtitleEn,
            subtitleEs: q.subtitleEs,
            // Hint with i18n
            hint: q.hint || q.hintFr,
            hintFr: q.hintFr || q.hint,
            hintEn: q.hintEn,
            hintEs: q.hintEs,
            // Type config with i18n placeholders
            type: {
              ...q.type,
              placeholder: q.type.placeholder || q.type.placeholderFr,
              placeholderFr: q.type.placeholderFr || q.type.placeholder,
              placeholderEn: q.type.placeholderEn,
              placeholderEs: q.type.placeholderEs,
            },
            // Options with i18n
            options: q.options.map((opt, optIndex) => ({
              id: opt.id || `opt_${Date.now()}_${optIndex}`,
              label: opt.label || opt.labelFr,
              labelFr: opt.labelFr || opt.label,
              labelEn: opt.labelEn,
              labelEs: opt.labelEs,
              description: opt.description || opt.descriptionFr,
              descriptionFr: opt.descriptionFr || opt.description,
              descriptionEn: opt.descriptionEn,
              descriptionEs: opt.descriptionEs,
              icon: opt.icon,
              color: opt.color,
              imageUrl: opt.imageUrl,
              order: optIndex,
              minValue: opt.minValue,
              maxValue: opt.maxValue,
              step: opt.step,
              unit: opt.unit,
              value: opt.value,
            })),
            required: q.required,
            order: index,
          })),
        }),
      });

      if (response.ok) {
        toast({
          title: 'Succes',
          description: 'Configuration mise a jour',
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
          title: 'Succes',
          description: 'Configuration publiee avec succes',
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
          title: 'Succes',
          description: 'Configuration archivee',
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
            <h1 className="text-3xl font-bold tracking-tight">Edition Onboarding</h1>
            <p className="text-muted-foreground">
              v{config.version} - {config.status}
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

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex border-b">
            <Link
              href={`/admin/onboarding/${params.id}`}
              className="flex-1 py-3 px-4 text-center border-b-2 border-primary font-medium text-primary"
            >
              Questions
            </Link>
            <Link
              href={`/admin/onboarding/${params.id}/information-screens`}
              className="flex-1 py-3 px-4 text-center border-b-2 border-transparent hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Info className="h-4 w-4" />
              Ecrans d&apos;information
            </Link>
            <Link
              href="/admin/onboarding/recommendation-rules"
              className="flex-1 py-3 px-4 text-center border-b-2 border-transparent hover:border-muted-foreground/20 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2"
            >
              <Brain className="h-4 w-4" />
              Regles de recommandation
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* i18n Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Languages className="h-5 w-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-900">Support multilingue (FR/EN/ES)</h3>
          <p className="text-sm text-blue-700 mt-1">
            Toutes les questions et options supportent maintenant les traductions francais, anglais et espagnol.
            Le francais est la langue principale (obligatoire), l&apos;anglais et l&apos;espagnol sont optionnels.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Informations generales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations generales</CardTitle>
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
                placeholder="Decrivez l'objectif de ce questionnaire..."
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
                  {questions.length} question{questions.length !== 1 ? 's' : ''} - Glisser-deposer pour reorganiser
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
                  Aucune question. Cliquez sur &quot;Ajouter une question&quot; pour commencer.
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
