import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/founderbrain-design-system/components/ui/card';
import { Button } from '@workspace/founderbrain-design-system/components/ui/button';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl bg-secondary text-primary"><AlertCircle className="h-5 w-5" /></div>
          <CardTitle className="text-2xl">This page isn’t here</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">The page may have moved, or the address may not be right. Let’s get you back to your workspace.</p>
          <Button asChild className="mt-5"><Link href="/"><ArrowLeft className="h-4 w-4" />Back to workspace</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
