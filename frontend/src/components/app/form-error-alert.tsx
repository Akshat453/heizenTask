import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type FormErrorAlertProps = {
  /** Messages that could not be attached to a specific field. */
  messages: string[];
  title?: string;
};

/** Form-level server errors, shown above the submit button. Renders nothing when empty. */
export function FormErrorAlert({ messages, title = "Please fix the following" }: FormErrorAlertProps) {
  if (messages.length === 0) return null;
  return (
    <Alert variant="destructive" className="border-danger/30 bg-danger-soft text-danger">
      <CircleAlert aria-hidden />
      <AlertTitle>{messages.length === 1 ? messages[0] : title}</AlertTitle>
      {messages.length > 1 && (
        <AlertDescription>
          <ul className="list-disc pl-4">
            {messages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </AlertDescription>
      )}
    </Alert>
  );
}
