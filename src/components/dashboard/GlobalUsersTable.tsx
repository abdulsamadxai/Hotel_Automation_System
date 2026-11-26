import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useGlobalStaff } from "@/hooks/useStaff";

/**
 * Every staff account across all hotels (the store's `getAll('global')`
 * path). Names come from the canonical `full_name` field.
 */
export function GlobalUsersTable() {
    const { data: staff = [], isLoading } = useGlobalStaff();

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    if (staff.length === 0) {
        return <p className="p-6 text-sm text-muted-foreground">No staff accounts yet.</p>;
    }

    return (
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Hotel Property</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {staff.map((member) => (
                    <TableRow key={member.id} className="hover:bg-primary/5 transition-colors">
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell>{member.email ?? "—"}</TableCell>
                        <TableCell>
                            <span className="capitalize">{member.role.replace("_", " ")}</span>
                        </TableCell>
                        <TableCell>{member.hotels?.name ?? "Global"}</TableCell>
                        <TableCell>
                            <Badge variant="outline" className={member.status === 'on_duty' ? "bg-status-success/5 text-status-success border-status-success/20" : ""}>
                                {member.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
