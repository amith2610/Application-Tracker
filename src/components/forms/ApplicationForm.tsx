"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Card } from "@/components/ui/Card";

const schema = z.object({
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  salary: z.string().optional(),
  stage: z.enum(["applied", "interviewing", "offer", "rejected"]),
  description: z.string().optional(),
  url: z.string().optional(),
  appliedAt: z.string().optional(),
});

export type ApplicationFormData = z.infer<typeof schema>;

type ApplicationFormProps = {
  defaultValues?: Partial<ApplicationFormData>;
  onSubmit: (data: ApplicationFormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
};

const labelClass = "mb-1 block text-sm font-medium text-secondary";
const errorClass = "mt-1 text-sm text-error";

export function ApplicationForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Create Application",
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      stage: "applied",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="flex flex-col gap-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="company" className={labelClass}>
              Company *
            </label>
            <Input
              id="company"
              {...register("company")}
              placeholder="Acme Inc"
              error={!!errors.company}
            />
            {errors.company && (
              <p className={errorClass}>{errors.company.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="role" className={labelClass}>
              Role *
            </label>
            <Input
              id="role"
              {...register("role")}
              placeholder="Software Engineer"
              error={!!errors.role}
            />
            {errors.role && (
              <p className={errorClass}>{errors.role.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="salary" className={labelClass}>
              Salary
            </label>
            <Input
              id="salary"
              {...register("salary")}
              placeholder="$120k - $150k"
            />
          </div>
          <div>
            <label htmlFor="stage" className={labelClass}>
              Stage
            </label>
            <Select id="stage" {...register("stage")}>
              <option value="applied">Applied</option>
              <option value="interviewing">Interviewing</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor="url" className={labelClass}>
            Job URL
          </label>
          <Input
            id="url"
            type="url"
            {...register("url")}
            placeholder="https://..."
          />
        </div>

        <div>
          <label htmlFor="appliedAt" className={labelClass}>
            Applied Date
          </label>
          <Input
            id="appliedAt"
            type="datetime-local"
            {...register("appliedAt")}
          />
        </div>

        <div>
          <label htmlFor="description" className={labelClass}>
            Description / Notes
          </label>
          <Textarea
            id="description"
            {...register("description")}
            rows={4}
            placeholder="Job description, requirements, notes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" onClick={onCancel} variant="secondary">
              Cancel
            </Button>
          )}
        </div>
      </Card>
    </form>
  );
}
