'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "@/hooks/use-toast"
import { client } from '@/lib/api'

interface StartTestRunButtonProps {
  systemId: string
  profileConfigurationId: string
}

export function StartTestRunButton({ systemId, profileConfigurationId }: StartTestRunButtonProps) {
  const [open, setOpen] = useState(false)
  const queryClient = client.useQueryClient()

  const { mutate, isPending } = client.createTestRun.useMutation({
    onSuccess: (response) => {
      if (response.status === 201) {
        toast({
          title: "Test Run Started",
          description: "A new test run has been initiated.",
        })
        // Invalidate the test runs query to trigger a refetch
        queryClient.invalidateQueries({
          queryKey: ['test-runs', systemId, profileConfigurationId]
        })
        setOpen(false)
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to start test run. Please try again.",
        variant: "destructive",
      })
      setOpen(false)
    }
  })

  const handleStartTestRun = () => {
    mutate({
      params: {
        systemId,
        profileConfigurationId
      },
      body: {
        profileConfigurationId
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button>Start New Test Run</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start New Test Run</AlertDialogTitle>
          <AlertDialogDescription>
            This will initiate a new conformance test run. The process may take several minutes to complete.
            Are you sure you want to continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleStartTestRun}
            disabled={isPending}
          >
            {isPending ? "Starting..." : "Start Test Run"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}