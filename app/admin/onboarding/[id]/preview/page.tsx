'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchWithAuth } from '@/lib/api/fetch-with-auth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import Link from 'next/link';
import type { OnboardingConfig } from '@/types/onboarding';
import { cn } from '@/lib/utils';

export default function PreviewOnboardingPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [config, setConfig] = React.useState<OnboardingConfig | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string[]>>({});

  React.useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetchWithAuth(`/api/admin/onboarding/${params.id}`);
        if (response.ok) {
          const data: OnboardingConfig = await response.json();
          setConfig(data);
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
  }, [params.id, router, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!config || config.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4">
        <p className="text-muted-foreground">Aucune question à prévisualiser</p>
        <Link href={`/admin/onboarding/${params.id}`}>
          <Button>Retour à l'édition</Button>
        </Link>
      </div>
    );
  }

  const currentQuestion = config.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / config.questions.length) * 100;

  const handleOptionSelect = (optionId: string) => {
    const questionId = currentQuestion.id;
    const current = selectedOptions[questionId] || [];

    if (currentQuestion.type.allowMultiple) {
      // Multiple selection
      if (current.includes(optionId)) {
        setSelectedOptions({
          ...selectedOptions,
          [questionId]: current.filter((id) => id !== optionId),
        });
      } else {
        setSelectedOptions({
          ...selectedOptions,
          [questionId]: [...current, optionId],
        });
      }
    } else {
      // Single selection
      setSelectedOptions({
        ...selectedOptions,
        [questionId]: [optionId],
      });
    }
  };

  const isOptionSelected = (optionId: string) => {
    const questionId = currentQuestion.id;
    return (selectedOptions[questionId] || []).includes(optionId);
  };

  const canGoNext = () => {
    if (!currentQuestion.required) return true;
    const questionId = currentQuestion.id;
    const selected = selectedOptions[questionId] || [];
    return selected.length > 0;
  };

  const goNext = () => {
    if (currentQuestionIndex < config.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const goPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href={`/admin/onboarding/${params.id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
            </Link>
            <div className="text-sm text-muted-foreground">
              Mode Prévisualisation
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-900 border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} sur {config.questions.length}
            </span>
            <span className="text-sm font-medium text-orange-600">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 to-orange-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Question Card */}
          <Card className="border-2 border-orange-200 dark:border-orange-800">
            <CardContent className="pt-8 pb-6">
              <div className="space-y-6">
                {/* Category Badge */}
                <div className="inline-block">
                  <span className="px-3 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded-full">
                    {currentQuestion.category === 'goals' && 'Objectifs'}
                    {currentQuestion.category === 'experience' && 'Expérience'}
                    {currentQuestion.category === 'preferences' && 'Préférences'}
                    {currentQuestion.category === 'personalization' && 'Personnalisation'}
                  </span>
                </div>

                {/* Question Title */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {currentQuestion.title}
                </h2>

                {/* Subtitle */}
                {currentQuestion.subtitle && (
                  <p className="text-muted-foreground">{currentQuestion.subtitle}</p>
                )}

                {/* Options */}
                <div className="grid gap-3 mt-6">
                  {currentQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(option.id)}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border-2 transition-all hover:scale-[1.02] active:scale-[0.98]',
                        isOptionSelected(option.id)
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950 shadow-md'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-300'
                      )}
                    >
                      {/* Emoji Icon */}
                      {option.icon && (
                        <div className="text-3xl flex-shrink-0">{option.icon}</div>
                      )}

                      {/* Label */}
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {option.label}
                        </p>
                      </div>

                      {/* Checkmark */}
                      {isOptionSelected(option.id) && (
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                            <Check className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Required indicator */}
                {currentQuestion.required && (
                  <p className="text-sm text-muted-foreground text-center">
                    * Cette question est obligatoire
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={goPrevious}
              disabled={currentQuestionIndex === 0}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Précédent
            </Button>

            {currentQuestionIndex < config.questions.length - 1 ? (
              <Button
                onClick={goNext}
                disabled={!canGoNext()}
                className="flex-1 bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700"
              >
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                disabled={!canGoNext()}
                className="flex-1 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700"
              >
                Terminer
                <Check className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>

          {/* Info Box */}
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Mode Prévisualisation :</strong> Cette interface simule l'expérience utilisateur sur mobile.
                Les réponses ne sont pas enregistrées.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
